import * as vscode from 'vscode';
import { ToonCompletionProvider } from '../../src/features/completion';
import { createDocument } from './testUtils';

describe('ToonCompletionProvider', () => {
  it('returns field names inside a header field section', () => {
    const document = createDocument('users[1]{id,name}:\n  1,Alice\nroles[0]{role}:');
    const completions = new ToonCompletionProvider().provideCompletionItems(
      document,
      new vscode.Position(0, 10)
    ) as vscode.CompletionItem[];

    expect(completions.map((item) => item.label)).toContain('name');
  });

  it('returns undefined outside a header field section', () => {
    const document = createDocument('users[1]{id,name}:');

    expect(
      new ToonCompletionProvider().provideCompletionItems(document, new vscode.Position(0, 2))
    ).toBeUndefined();
  });

  it('returns sorted unique fields across all blocks', () => {
    const document = createDocument('b[0]{z,a}:\na[0]{a,m}:');
    const completions = new ToonCompletionProvider().provideCompletionItems(
      document,
      new vscode.Position(0, 6)
    ) as vscode.CompletionItem[];

    expect(completions.map((item) => item.label)).toEqual(['a', 'm', 'z']);
  });
});
