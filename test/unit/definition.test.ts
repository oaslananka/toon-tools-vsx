import * as vscode from 'vscode';
import { ToonDefinitionProvider } from '../../src/features/definition';
import { createDocument } from './testUtils';

describe('ToonDefinitionProvider', () => {
  it('targets the matching header field for a row value', () => {
    const document = createDocument('users[1]{id,name}:\n  1,Alice');
    const location = new ToonDefinitionProvider().provideDefinition(
      document,
      new vscode.Position(1, 5)
    );

    expect(location).toEqual(new vscode.Location(document.uri, new vscode.Range(0, 12, 0, 16)));
  });

  it('uses parser value spans for quoted commas in row values', () => {
    const row = '  1,"Ada, Lovelace",admin';
    const document = createDocument(`users[1]{id,name,role}:\n${row}`);
    const location = new ToonDefinitionProvider().provideDefinition(
      document,
      new vscode.Position(1, row.indexOf('Lovelace'))
    );

    expect(location).toEqual(new vscode.Location(document.uri, new vscode.Range(0, 12, 0, 16)));
  });

  it('targets the selected header field token when invoked on a field', () => {
    const document = createDocument('users[1]{id,user_id}:\n  1,Alice');
    const location = new ToonDefinitionProvider().provideDefinition(
      document,
      new vscode.Position(0, 14)
    );

    expect(location).toEqual(new vscode.Location(document.uri, new vscode.Range(0, 12, 0, 19)));
  });

  it('targets the block name for header block context', () => {
    const document = createDocument('  users[1]{id,name}:\n  1,Alice');
    const location = new ToonDefinitionProvider().provideDefinition(
      document,
      new vscode.Position(0, 8)
    );

    expect(location).toEqual(new vscode.Location(document.uri, new vscode.Range(0, 2, 0, 7)));
  });

  it('targets the block name for row context outside values', () => {
    const document = createDocument('users[1]{id,name}:\n  1,Alice');
    const location = new ToonDefinitionProvider().provideDefinition(
      document,
      new vscode.Position(1, 1)
    );

    expect(location).toEqual(new vscode.Location(document.uri, new vscode.Range(0, 0, 0, 5)));
  });

  it('targets the block name for comments inside a block', () => {
    const document = createDocument('users[1]{id,name}:\n  # source row\n  1,Alice');
    const location = new ToonDefinitionProvider().provideDefinition(
      document,
      new vscode.Position(1, 4)
    );

    expect(location).toEqual(new vscode.Location(document.uri, new vscode.Range(0, 0, 0, 5)));
  });

  it('skips earlier blocks when resolving a later row value', () => {
    const document = createDocument(
      'users[1]{id,name}:\n  1,Alice\norders[1]{order_id,total}:\n  7,20'
    );
    const location = new ToonDefinitionProvider().provideDefinition(
      document,
      new vscode.Position(3, 5)
    );

    expect(location).toEqual(new vscode.Location(document.uri, new vscode.Range(2, 19, 2, 24)));
  });

  it('returns undefined on blank lines inside a block', () => {
    const document = createDocument('users[1]{id,name}:\n\n  1,Alice');

    expect(
      new ToonDefinitionProvider().provideDefinition(document, new vscode.Position(1, 0))
    ).toBeUndefined();
  });

  it('returns undefined outside TOON block context', () => {
    const document = createDocument('# just a comment');

    expect(
      new ToonDefinitionProvider().provideDefinition(document, new vscode.Position(0, 3))
    ).toBeUndefined();
  });
});
