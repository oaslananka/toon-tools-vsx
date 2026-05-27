import * as vscode from 'vscode';
import { ToonRenameProvider } from '../../src/features/rename';
import { createDocument } from './testUtils';

describe('ToonRenameProvider', () => {
  it('prepares block renames from parser name spans', () => {
    const document = createDocument('  users[1]{id,name}:\n  1,Alice');
    const result = new ToonRenameProvider().prepareRename(document, new vscode.Position(0, 3));

    expect(result).toEqual({
      placeholder: 'users',
      range: new vscode.Range(0, 2, 0, 7),
    });
  });

  it('prepares field renames from parser field spans', () => {
    const document = createDocument('users[1]{id,user_id}:\n  1,Alice');
    const result = new ToonRenameProvider().prepareRename(document, new vscode.Position(0, 14));

    expect(result).toEqual({
      placeholder: 'user_id',
      range: new vscode.Range(0, 12, 0, 19),
    });
  });

  it('rejects invalid TOON identifiers', async () => {
    const document = createDocument('users[1]{id,name}:\n  1,Alice');
    const result = new ToonRenameProvider().provideRenameEdits(
      document,
      new vscode.Position(0, 9),
      'bad-name'
    ) as Promise<vscode.WorkspaceEdit>;

    await expect(result).rejects.toThrow('Invalid TOON identifier.');
  });

  it('renames all matching field tokens in the selected block only', () => {
    const document = createDocument(
      'users[1]{id,name,id}:\n  1,Alice,2\norders[1]{id,name}:\n  3,Bob'
    );
    const result = new ToonRenameProvider().provideRenameEdits(
      document,
      new vscode.Position(0, 9),
      'identifier'
    ) as vscode.WorkspaceEdit;

    expect(recordedEdits(result)).toEqual([
      {
        uri: document.uri,
        range: new vscode.Range(0, 9, 0, 11),
        newText: 'identifier',
      },
      {
        uri: document.uri,
        range: new vscode.Range(0, 17, 0, 19),
        newText: 'identifier',
      },
    ]);
  });

  it('renames matching block headers by parser name range', () => {
    const document = createDocument('users[0]{}:\nusers[0]{}:');
    const result = new ToonRenameProvider().provideRenameEdits(
      document,
      new vscode.Position(0, 1),
      'people'
    ) as vscode.WorkspaceEdit;

    expect(recordedEdits(result)).toEqual([
      {
        uri: document.uri,
        range: new vscode.Range(0, 0, 0, 5),
        newText: 'people',
      },
      {
        uri: document.uri,
        range: new vscode.Range(1, 0, 1, 5),
        newText: 'people',
      },
    ]);
  });

  it('returns no edits outside renameable tokens', () => {
    const document = createDocument('users[1]{id,name}:\n  1,Alice');

    expect(
      new ToonRenameProvider().provideRenameEdits(document, new vscode.Position(1, 2), 'value')
    ).toBeUndefined();
  });

  it('rejects prepare rename outside renameable tokens', async () => {
    const document = createDocument('users[1]{id,name}:\n  1,Alice');
    const result = new ToonRenameProvider().prepareRename(document, new vscode.Position(1, 2));

    await expect(result as Promise<vscode.Range>).rejects.toThrow('No renameable token at cursor.');
  });
});

interface RecordedEdit {
  uri: vscode.Uri;
  range: vscode.Range;
  newText: string;
}

function recordedEdits(edit: vscode.WorkspaceEdit): RecordedEdit[] {
  return (edit as unknown as { edits: RecordedEdit[] }).edits;
}
