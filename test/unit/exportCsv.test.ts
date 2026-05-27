import * as vscode from 'vscode';
import { vi, type Mock } from 'vitest';
import { exportCsvCommand } from '../../src/convert/exportCsv';
import { createDocument } from './testUtils';

describe('exportCsvCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(vscode.window, { activeTextEditor: undefined });
  });

  it('writes the selected block as escaped CSV', async () => {
    const uri = vscode.Uri.file('/tmp/users.csv');
    (vscode.window.showQuickPick as Mock).mockResolvedValue('users');
    (vscode.window.showSaveDialog as Mock).mockResolvedValue(uri);
    Object.assign(vscode.window, {
      activeTextEditor: {
        document: createDocument('orders[1]{id}:\n  1\nusers[1]{id,note}:\n  2,"said ""hi"""'),
      },
    });

    await exportCsvCommand();

    expect(vscode.window.showQuickPick).toHaveBeenCalledWith(['orders', 'users'], {
      placeHolder: 'Select block to export as CSV',
    });
    expect(vscode.workspace.fs.writeFile).toHaveBeenCalledWith(
      uri,
      Buffer.from('id,note\n2,"said ""hi"""', 'utf-8')
    );
  });

  it('does not write when save is canceled', async () => {
    (vscode.window.showSaveDialog as Mock).mockResolvedValue(undefined);
    Object.assign(vscode.window, {
      activeTextEditor: {
        document: createDocument('users[1]{id,name}:\n  1,Alice'),
      },
    });

    await exportCsvCommand();

    expect(vscode.window.showSaveDialog).toHaveBeenCalledWith({
      filters: { CSV: ['csv'] },
      defaultUri: vscode.Uri.file('users.csv'),
    });
    expect(vscode.workspace.fs.writeFile).not.toHaveBeenCalled();
  });
});
