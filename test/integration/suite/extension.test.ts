import * as assert from 'assert';
import * as vscode from 'vscode';

const EXPECTED_COMMANDS = [
  'toon.convertJsonToToon',
  'toon.convertToonToJson',
  'toon.openJsonPreview',
  'toon.openToonPreview',
  'toon.openTableViewer',
  'toon.analyzeSizeTokens',
  'toon.exportCsv',
];

suite('TOON Tools Extension', () => {
  test('activates without error', async () => {
    const extension = vscode.extensions.getExtension('oaslananka.toon-tools-vsx');
    assert.ok(extension);
    await extension.activate();
    assert.ok(extension.isActive);
  });

  test('registers contributed commands', async () => {
    await activateExtension();
    const commands = await vscode.commands.getCommands(true);
    for (const command of EXPECTED_COMMANDS) {
      assert.ok(commands.includes(command), `Expected ${command} to be registered`);
    }
  });

  test('executes conversion commands against active editors', async function (this: Mocha.Context) {
    this.timeout(10000);
    await activateExtension();

    await showDocument('toon', 'users[1]{id,name}:\n  1,Alice');
    await vscode.commands.executeCommand('toon.convertToonToJson');
    assert.strictEqual(vscode.window.activeTextEditor?.document.languageId, 'json');
    assert.strictEqual(
      vscode.window.activeTextEditor.document.getText(),
      JSON.stringify({ users: [{ id: '1', name: 'Alice' }] }, null, 2)
    );

    await showDocument('json', '{"users":[{"id":1,"name":"Alice"}]}');
    await vscode.commands.executeCommand('toon.convertJsonToToon');
    assert.strictEqual(vscode.window.activeTextEditor?.document.languageId, 'toon');
    assert.strictEqual(
      vscode.window.activeTextEditor.document.getText(),
      'users[1]{id,name}:\n  1,Alice'
    );
  });

  test('executes preview commands against active editors', async function (this: Mocha.Context) {
    this.timeout(10000);
    await activateExtension();

    await showDocument('toon', 'users[1]{id,name}:\n  1,Alice');
    await vscode.commands.executeCommand('toon.openJsonPreview');
    assert.strictEqual(vscode.window.activeTextEditor?.document.languageId, 'json');
    assert.strictEqual(
      vscode.window.activeTextEditor.document.getText(),
      JSON.stringify({ users: [{ id: '1', name: 'Alice' }] }, null, 2)
    );

    await showDocument('json', '{"users":[{"id":1,"name":"Alice"}]}');
    await vscode.commands.executeCommand('toon.openToonPreview');
    assert.strictEqual(vscode.window.activeTextEditor?.document.languageId, 'toon');
    assert.strictEqual(
      vscode.window.activeTextEditor.document.getText(),
      'users[1]{id,name}:\n  1,Alice'
    );
  });

  test('executes webview commands against active TOON editors', async function (this: Mocha.Context) {
    this.timeout(10000);
    await activateExtension();

    await showDocument('toon', 'users[1]{id,name}:\n  1,Alice');
    await assert.doesNotReject(async () => {
      await vscode.commands.executeCommand('toon.openTableViewer');
    });

    await showDocument('toon', 'users[1]{id,name}:\n  1,Alice');
    await assert.doesNotReject(async () => {
      await vscode.commands.executeCommand('toon.analyzeSizeTokens');
    });
  });

  test('command error paths return without an active editor', async function (this: Mocha.Context) {
    this.timeout(10000);
    await activateExtension();
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');

    for (const command of EXPECTED_COMMANDS) {
      await assert.doesNotReject(async () => {
        await vscode.commands.executeCommand(command);
      });
    }
  });

  test('formats a sample TOON document', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'toon',
      content: 'users[1]{id,name}:\n    1, Alice',
    });
    const edits = await vscode.commands.executeCommand<vscode.TextEdit[]>(
      'vscode.executeFormatDocumentProvider',
      document.uri,
      { tabSize: 2, insertSpaces: true }
    );
    const workspaceEdit = new vscode.WorkspaceEdit();
    edits?.forEach((edit) => workspaceEdit.replace(document.uri, edit.range, edit.newText));

    assert.ok(edits?.length);
    assert.ok(await vscode.workspace.applyEdit(workspaceEdit));
    assert.strictEqual(document.getText(), 'users[1]{id,name}:\n  1,Alice');
  });

  test('renames a TOON field through the VS Code command', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'toon',
      content: 'users[1]{id,name}:\n  1,Alice',
    });
    await vscode.window.showTextDocument(document);

    const workspaceEdit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
      'vscode.executeDocumentRenameProvider',
      document.uri,
      new vscode.Position(0, 9),
      'identifier'
    );

    assert.ok(workspaceEdit);
    assert.strictEqual(workspaceEdit.size, 1);
    assert.ok(await vscode.workspace.applyEdit(workspaceEdit));
    assert.strictEqual(document.getText(), 'users[1]{identifier,name}:\n  1,Alice');
  });

  test('publishes diagnostics for invalid TOON documents', async function (this: Mocha.Context) {
    this.timeout(10000);

    const extension = vscode.extensions.getExtension('oaslananka.toon-tools-vsx');
    assert.ok(extension);
    await extension.activate();
    await vscode.workspace
      .getConfiguration('toon')
      .update('linter.debounceMs', 0, vscode.ConfigurationTarget.Global);
    await vscode.workspace
      .getConfiguration('toon')
      .update('linter.enabled', true, vscode.ConfigurationTarget.Global);

    const documentUri = vscode.Uri.file(
      vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/test-fixtures/sample-invalid.toon'
    );
    const document = await vscode.workspace.openTextDocument(documentUri);
    await vscode.window.showTextDocument(document);

    const diagnostics = await waitForDiagnostics(document.uri, (current) =>
      current.some(
        (diagnostic) =>
          diagnostic.message === 'Expected 3 values, found 2.' &&
          diagnostic.severity === vscode.DiagnosticSeverity.Error
      )
    );

    assert.ok(diagnostics.length >= 2, 'Should have multiple diagnostics');
    const valueDiagnostic = diagnostics.find((d) => d.message === 'Expected 3 values, found 2.');
    assert.ok(valueDiagnostic);
    assert.deepStrictEqual(valueDiagnostic.range, new vscode.Range(2, 2, 2, 7));
  });
});

async function waitForDiagnostics(
  uri: vscode.Uri,
  predicate: (diagnostics: vscode.Diagnostic[]) => boolean
): Promise<vscode.Diagnostic[]> {
  const started = Date.now();
  while (Date.now() - started < 5000) {
    const diagnostics = vscode.languages.getDiagnostics(uri);
    if (predicate(diagnostics)) {
      return diagnostics;
    }
    await sleep(50);
  }
  return vscode.languages.getDiagnostics(uri);
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function activateExtension(): Promise<vscode.Extension<unknown>> {
  const extension = vscode.extensions.getExtension('oaslananka.toon-tools-vsx');
  assert.ok(extension);
  await extension.activate();
  assert.ok(extension.isActive);
  return extension;
}

async function showDocument(language: string, content: string): Promise<vscode.TextDocument> {
  const document = await vscode.workspace.openTextDocument({ language, content });
  await vscode.window.showTextDocument(document);
  return document;
}
