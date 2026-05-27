#Requires -Version 5.1
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[^/]+/[^/]+$')]
  [string] $OwnerRepo,

  [switch] $Apply,

  [ValidateSet('active', 'disabled', 'evaluate')]
  [string] $Enforcement = 'active',

  [ValidateNotNullOrEmpty()]
  [string] $RulesetName = 'main'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RequiredChecks = @(
  'Commitlint',
  'Dependency Review',
  'Fast Lint',
  'Gitleaks',
  'Analyze',
  'CodeQL',
  'CI (ubuntu-24.04)',
  'CI (windows-2025)',
  'CI (macos-15)'
)

function Assert-GitHubCli {
  if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw 'GitHub CLI (gh) is required. Install gh and authenticate with repository administration write permission.'
  }
}

function ConvertTo-JsonDocument {
  param(
    [Parameter(Mandatory = $true, ValueFromPipeline = $true)]
    [object] $Value
  )

  $Value | ConvertTo-Json -Depth 30
}

function Write-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)]
    [string] $Path,

    [Parameter(Mandatory = $true)]
    [string] $Value
  )

  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Value, $encoding)
}

function Invoke-GitHubApi {
  param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('GET', 'POST', 'PUT', 'PATCH')]
    [string] $Method,

    [Parameter(Mandatory = $true)]
    [string] $Path,

    [object] $Body
  )

  $ghArgs = @('api', '-X', $Method, $Path)

  if ($PSBoundParameters.ContainsKey('Body')) {
    $inputPath = [System.IO.Path]::GetTempFileName()

    try {
      Write-Utf8NoBom -Path $inputPath -Value (ConvertTo-JsonDocument -Value $Body)
      $ghArgs += @('--input', $inputPath)
      $output = & gh @ghArgs
    }
    finally {
      if (Test-Path -LiteralPath $inputPath) {
        Remove-Item -LiteralPath $inputPath -Force
      }
    }
  }
  else {
    $output = & gh @ghArgs
  }

  if ($LASTEXITCODE -ne 0) {
    throw "gh api failed for $Method $Path"
  }

  $json = ($output | Out-String).Trim()
  if ([string]::IsNullOrWhiteSpace($json)) {
    return $null
  }

  $json | ConvertFrom-Json
}

function New-RepositorySettingsPayload {
  [ordered] @{
    allow_merge_commit          = $false
    allow_squash_merge          = $true
    allow_rebase_merge          = $true
    delete_branch_on_merge      = $true
    allow_auto_merge            = $true
    allow_update_branch         = $true
    squash_merge_commit_title   = 'PR_TITLE'
    squash_merge_commit_message = 'PR_BODY'
  }
}

function New-RequiredStatusCheck {
  param(
    [Parameter(Mandatory = $true)]
    [string] $Context
  )

  [ordered] @{
    context = $Context
  }
}

function New-MainRulesetPayload {
  param(
    [Parameter(Mandatory = $true)]
    [string] $Name,

    [Parameter(Mandatory = $true)]
    [string] $RulesetEnforcement
  )

  $requiredStatusChecks = @(
    foreach ($check in $RequiredChecks) {
      New-RequiredStatusCheck -Context $check
    }
  )

  [ordered] @{
    name          = $Name
    target        = 'branch'
    enforcement   = $RulesetEnforcement
    bypass_actors = @()
    conditions    = [ordered] @{
      ref_name = [ordered] @{
        include = @('~DEFAULT_BRANCH')
        exclude = @()
      }
    }
    rules         = @(
      [ordered] @{
        type = 'deletion'
      },
      [ordered] @{
        type = 'non_fast_forward'
      },
      [ordered] @{
        type = 'required_linear_history'
      },
      [ordered] @{
        type       = 'pull_request'
        parameters = [ordered] @{
          allowed_merge_methods             = @('squash', 'rebase')
          dismiss_stale_reviews_on_push     = $true
          require_code_owner_review         = $true
          require_last_push_approval        = $true
          required_approving_review_count   = 1
          required_review_thread_resolution = $true
        }
      },
      [ordered] @{
        type       = 'required_status_checks'
        parameters = [ordered] @{
          do_not_enforce_on_create           = $false
          required_status_checks             = $requiredStatusChecks
          strict_required_status_checks_policy = $true
        }
      }
    )
  }
}

function Find-RepositoryRuleset {
  param(
    [Parameter(Mandatory = $true)]
    [AllowEmptyCollection()]
    [object[]] $Rulesets,

    [Parameter(Mandatory = $true)]
    [string] $Name
  )

  @($Rulesets | Where-Object { $_.name -eq $Name -and $_.target -eq 'branch' }) |
    Select-Object -First 1
}

Assert-GitHubCli

$repositorySettings = New-RepositorySettingsPayload
$rulesetPayload = New-MainRulesetPayload -Name $RulesetName -RulesetEnforcement $Enforcement

$rulesetsResult = Invoke-GitHubApi -Method GET -Path "repos/$OwnerRepo/rulesets"
if ($null -eq $rulesetsResult) {
  $rulesets = @()
}
else {
  $rulesets = @($rulesetsResult)
}
$existingRuleset = Find-RepositoryRuleset -Rulesets $rulesets -Name $RulesetName

if (-not $Apply) {
  [ordered] @{
    dry_run                      = $true
    owner_repo                   = $OwnerRepo
    repository_settings_endpoint = "PATCH /repos/$OwnerRepo"
    ruleset_endpoint             = if ($existingRuleset) {
      "PUT /repos/$OwnerRepo/rulesets/$($existingRuleset.id)"
    }
    else {
      "POST /repos/$OwnerRepo/rulesets"
    }
    repository_settings          = $repositorySettings
    ruleset_payload              = $rulesetPayload
  } | ConvertTo-JsonDocument
  exit 0
}

$repositoryResult = Invoke-GitHubApi -Method PATCH -Path "repos/$OwnerRepo" -Body $repositorySettings

if ($existingRuleset) {
  $rulesetResult = Invoke-GitHubApi -Method PUT -Path "repos/$OwnerRepo/rulesets/$($existingRuleset.id)" -Body $rulesetPayload
}
else {
  $rulesetResult = Invoke-GitHubApi -Method POST -Path "repos/$OwnerRepo/rulesets" -Body $rulesetPayload
}

[ordered] @{
  applied                = $true
  owner_repo             = $OwnerRepo
  merge_commit_allowed   = $repositoryResult.allow_merge_commit
  squash_merge_allowed   = $repositoryResult.allow_squash_merge
  rebase_merge_allowed   = $repositoryResult.allow_rebase_merge
  delete_branch_on_merge = $repositoryResult.delete_branch_on_merge
  ruleset                = [ordered] @{
    id                 = $rulesetResult.id
    name               = $rulesetResult.name
    target             = $rulesetResult.target
    enforcement        = $rulesetResult.enforcement
    bypass_actor_count = @($rulesetResult.bypass_actors).Count
    required_checks    = $RequiredChecks
  }
} | ConvertTo-JsonDocument
