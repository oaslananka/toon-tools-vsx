import * as vscode from 'vscode';
import { convertJsonToToonCommand } from './convert/jsonToToon';
import { convertToonToJsonCommand } from './convert/toonToJson';
import { exportCsvCommand } from './convert/exportCsv';
import { openJsonPreviewCommand, openToonPreviewCommand } from './convert/preview';
import { ToonCompletionProvider } from './features/completion';
import { ToonDefinitionProvider } from './features/definition';
import { ToonFoldingProvider } from './features/folding';
import { ToonHoverProvider } from './features/hover';
import { ToonInlayHintsProvider } from './features/inlayHints';
import { ToonRenameProvider } from './features/rename';
import { ToonSymbolProvider } from './features/symbols';
import { ToonFormattingProvider } from './format/toonFormatter';
import {
  TOON_DOCUMENT_SELECTOR,
  TOON_LANGUAGE_ID,
  registerLanguageConfiguration,
} from './language/toonLanguage';
import { registerToonLinter } from './lint/toonLinter';
import { openSizeAnalyzerCommand } from './ui/sizeAnalyzer';
import { createStatusBarItem } from './ui/statusBar';
import { openTableViewerCommand } from './ui/tableViewer';
import { ToonExplorerProvider } from './ui/toonExplorer';
import { registerAll } from './utils/disposable';

export function activate(context: vscode.ExtensionContext): void {
  registerLanguageConfiguration(context);

  registerAll(
    context,
    vscode.languages.registerDocumentFormattingEditProvider(
      TOON_LANGUAGE_ID,
      new ToonFormattingProvider()
    ),
    vscode.languages.registerCompletionItemProvider(
      TOON_LANGUAGE_ID,
      new ToonCompletionProvider(),
      ',',
      ' '
    ),
    vscode.languages.registerFoldingRangeProvider(
      TOON_DOCUMENT_SELECTOR,
      new ToonFoldingProvider()
    ),
    vscode.languages.registerDocumentSymbolProvider(
      TOON_DOCUMENT_SELECTOR,
      new ToonSymbolProvider()
    ),
    vscode.languages.registerHoverProvider(TOON_DOCUMENT_SELECTOR, new ToonHoverProvider()),
    vscode.languages.registerInlayHintsProvider(
      TOON_DOCUMENT_SELECTOR,
      new ToonInlayHintsProvider()
    ),
    vscode.languages.registerRenameProvider(TOON_DOCUMENT_SELECTOR, new ToonRenameProvider()),
    vscode.languages.registerDefinitionProvider(
      TOON_DOCUMENT_SELECTOR,
      new ToonDefinitionProvider()
    ),
    vscode.commands.registerCommand('toon.convertJsonToToon', convertJsonToToonCommand),
    vscode.commands.registerCommand('toon.convertToonToJson', convertToonToJsonCommand),
    vscode.commands.registerCommand('toon.openJsonPreview', openJsonPreviewCommand),
    vscode.commands.registerCommand('toon.openToonPreview', openToonPreviewCommand),
    vscode.commands.registerCommand('toon.openTableViewer', () => openTableViewerCommand(context)),
    vscode.commands.registerCommand('toon.analyzeSizeTokens', () =>
      openSizeAnalyzerCommand(context)
    ),
    vscode.commands.registerCommand('toon.exportCsv', exportCsvCommand),
    vscode.window.registerTreeDataProvider('toonToolsView', new ToonExplorerProvider())
  );

  const diagnosticCollection = vscode.languages.createDiagnosticCollection(TOON_LANGUAGE_ID);
  context.subscriptions.push(diagnosticCollection);
  registerToonLinter(diagnosticCollection, context);

  createStatusBarItem(context);
}

export function deactivate(): void {}
