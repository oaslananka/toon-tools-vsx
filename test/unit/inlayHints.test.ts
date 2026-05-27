import * as vscode from 'vscode';
import { ToonInlayHintsProvider } from '../../src/features/inlayHints';
import { createDocument } from './testUtils';
import { __setConfiguration } from './vscodeMock';

describe('ToonInlayHintsProvider', () => {
  afterEach(() => {
    __setConfiguration({});
  });

  it('places hints at compact value starts', () => {
    const hints = provideHints('users[1]{id,name,role}:\n1,Alice,admin');

    expect(hintSummary(hints)).toEqual([
      ['id:', 1, 0],
      ['name:', 1, 2],
      ['role:', 1, 8],
    ]);
  });

  it('places hints at spaced value starts', () => {
    const hints = provideHints('users[1]{id,name,role}:\n  1, Alice, admin');

    expect(hintSummary(hints)).toEqual([
      ['id:', 1, 2],
      ['name:', 1, 5],
      ['role:', 1, 12],
    ]);
  });

  it('places hints inside quoted values with commas', () => {
    const hints = provideHints('users[1]{id,name,role}:\n  1,"Ada, Lovelace",admin');

    expect(hintSummary(hints)).toEqual([
      ['id:', 1, 2],
      ['name:', 1, 5],
      ['role:', 1, 20],
    ]);
  });

  it('places hints at empty value spans', () => {
    const hints = provideHints('users[1]{id,name,role}:\n  1,,admin');

    expect(hintSummary(hints)).toEqual([
      ['id:', 1, 2],
      ['name:', 1, 4],
      ['role:', 1, 5],
    ]);
  });

  it('respects the requested line range', () => {
    const hints = provideHints(
      'users[2]{id,name}:\n  1,Alice\n  2,Bob',
      new vscode.Range(2, 0, 2, 10)
    );

    expect(hintSummary(hints)).toEqual([
      ['id:', 2, 2],
      ['name:', 2, 4],
    ]);
  });

  it('returns no hints when disabled', () => {
    __setConfiguration({ 'inlayHints.enabled': false });

    expect(provideHints('users[1]{id}:\n  1')).toEqual([]);
  });
});

function provideHints(
  source: string,
  range = new vscode.Range(0, 0, Number.MAX_SAFE_INTEGER, 0)
): vscode.InlayHint[] {
  const result = new ToonInlayHintsProvider().provideInlayHints(createDocument(source), range);
  return result as vscode.InlayHint[];
}

function hintSummary(hints: vscode.InlayHint[]): Array<[string, number, number]> {
  return hints.map((hint) => [hint.label as string, hint.position.line, hint.position.character]);
}
