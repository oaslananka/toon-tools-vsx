import * as vscode from 'vscode';
import { vi } from 'vitest';
import { parseToonBlocks } from '../../src/parser/toonParser';
import {
  buildTableViewerHtml,
  buildTableViewerPayload,
  createTableViewerHtml,
  resolveTableViewerResourceUris,
  type TableViewerPayloadBlock,
  type TableViewerResourceUris,
} from '../../src/ui/tableViewerHtml';

describe('table viewer HTML builder', () => {
  it('maps parsed TOON blocks into a webview payload', () => {
    const blocks = parseToonBlocks('users[2]{id,name}:\n  1,Alice\n  2,Bob');

    expect(buildTableViewerPayload(blocks)).toEqual([
      {
        name: 'users',
        declaredRows: 2,
        fields: ['id', 'name'],
        rows: [
          ['1', 'Alice'],
          ['2', 'Bob'],
        ],
      },
    ]);
  });

  it('resolves reset, style, and script resource URIs through the webview', () => {
    const webview = createResourceWebview();

    const resources = resolveTableViewerResourceUris(webview, vscode.Uri.file('/extension'));

    expect(resources).toEqual({
      reset: 'webview:/extension/media/reset.css',
      style: 'webview:/extension/media/tableViewer.css',
      script: 'webview:/extension/media/tableViewer.js',
    });
    expect(webview.asWebviewUri).toHaveBeenCalledTimes(3);
    expect(webview.asWebviewUri).toHaveBeenNthCalledWith(
      1,
      vscode.Uri.file('/extension/media/reset.css')
    );
    expect(webview.asWebviewUri).toHaveBeenNthCalledWith(
      2,
      vscode.Uri.file('/extension/media/tableViewer.css')
    );
    expect(webview.asWebviewUri).toHaveBeenNthCalledWith(
      3,
      vscode.Uri.file('/extension/media/tableViewer.js')
    );
  });

  it('builds CSP, nonce, resource links, and escaped payload data', () => {
    const html = buildTableViewerHtml({
      cspSource: 'vscode-webview://test',
      nonce: 'test-nonce',
      resources: createResources(),
      payload: createHostilePayload(),
    });

    expect(html).toContain(
      "default-src 'none'; img-src vscode-webview://test https:; style-src vscode-webview://test; script-src 'nonce-test-nonce' vscode-webview://test;"
    );
    expect(html).toContain('<link rel="stylesheet" href="webview:/reset.css" />');
    expect(html).toContain('<link rel="stylesheet" href="webview:/tableViewer.css" />');
    expect(html).toContain(
      '<script nonce="test-nonce">window.__TOON_TABLE_DATA__ = [{"name":"users"'
    );
    expect(html).toContain('<script nonce="test-nonce" src="webview:/tableViewer.js"></script>');
    expect(html).toContain('\\u003c/script\\u003e');
    expect(html).toContain('\\u2028');
    expect(html).toContain('\\u2029');
    expect(html).not.toContain('</script><script>alert');
    expect(html).not.toContain('<img src=x');
  });

  it('creates full HTML from webview resources and parsed blocks without an extension host', () => {
    const webview = createResourceWebview('vscode-webview://runtime');
    const blocks = parseToonBlocks('users[1]{id,note}:\n  1,hello');

    const html = createTableViewerHtml(
      webview as unknown as vscode.Webview,
      vscode.Uri.file('/extension'),
      blocks
    );

    expect(html).toContain("script-src 'nonce-");
    expect(html).toContain('webview:/extension/media/reset.css');
    expect(html).toContain('webview:/extension/media/tableViewer.css');
    expect(html).toContain('webview:/extension/media/tableViewer.js');
    expect(html).toContain('"rows":[["1","hello"]]');
  });
});

function createResourceWebview(
  cspSource = 'vscode-webview://test'
): Pick<vscode.Webview, 'asWebviewUri' | 'cspSource'> {
  return {
    cspSource,
    asWebviewUri: vi.fn((uri: vscode.Uri) => vscode.Uri.parse(`webview:${uri.fsPath}`)),
  };
}

function createResources(): TableViewerResourceUris {
  return {
    reset: 'webview:/reset.css',
    style: 'webview:/tableViewer.css',
    script: 'webview:/tableViewer.js',
  };
}

function createHostilePayload(): TableViewerPayloadBlock[] {
  return [
    {
      name: 'users',
      declaredRows: 1,
      fields: ['id', 'note', 'html', 'separator'],
      rows: [
        [
          '1',
          '</script><script>alert("x")</script>',
          '<img src=x onerror=alert(1)>',
          'line\u2028paragraph\u2029',
        ],
      ],
    },
  ];
}
