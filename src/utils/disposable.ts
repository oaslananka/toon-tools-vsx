import * as vscode from 'vscode';

/**
 * Registers an array of disposables on the extension context and returns them.
 */
export function registerAll(
  context: vscode.ExtensionContext,
  ...disposables: vscode.Disposable[]
): vscode.Disposable[] {
  context.subscriptions.push(...disposables);
  return disposables;
}
