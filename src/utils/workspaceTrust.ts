import * as vscode from 'vscode';

export const TRUSTED_WORKSPACE_REQUIRED_MESSAGE =
  'TOON Tools: this command requires a trusted workspace before running conversion, preview, table viewer, analyzer, or export actions.';

export function trustedWorkspaceCommand<T extends unknown[]>(
  handler: (...args: T) => Promise<void> | void
): (...args: T) => Promise<void> {
  return async (...args: T): Promise<void> => {
    if (!vscode.workspace.isTrusted) {
      await vscode.window.showWarningMessage(TRUSTED_WORKSPACE_REQUIRED_MESSAGE);
      return;
    }

    await handler(...args);
  };
}
