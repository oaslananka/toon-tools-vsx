# Architecture Decision Records

This directory records durable technical decisions for TOON Tools VSX.

Create an ADR when a change affects one of these areas:

- Supported runtime or package-manager versions.
- Release, publishing, provenance, or package-distribution policy.
- GitHub Actions, repository rules, security automation, or dependency-update policy.
- Public extension behavior, TOON compatibility, or user-facing command contracts.
- Long-lived architecture, testing, or packaging trade-offs that future maintainers will revisit.

Use [0000-template.md](0000-template.md) for new decisions. Number ADRs sequentially, keep one
decision per file, and link the ADR from the pull request that implements the decision.

## Index

| ADR                                        | Status   | Decision                                       |
| ------------------------------------------ | -------- | ---------------------------------------------- |
| [0001](0001-runtime-and-release-policy.md) | Accepted | Runtime and release automation policy baseline |
