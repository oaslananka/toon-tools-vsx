import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';

describe('table viewer webview accessibility', () => {
  it('renders sortable column headers as buttons with aria-sort on the sorted column', () => {
    const { document } = runTableViewer();
    const tableContainer = document.getElementById('table');
    const headers = findByTag(tableContainer, 'th');
    const buttons = findByTag(tableContainer, 'button');

    expect(headers).toHaveLength(2);
    expect(buttons).toHaveLength(2);
    expect(headers[0].getAttribute('aria-sort')).toBe('ascending');
    expect(headers[1].getAttribute('aria-sort')).toBe('none');
    expect(buttons[0].type).toBe('button');
    expect(buttons[0].getAttribute('data-sort-index')).toBe('0');

    const indicator = findByClass(buttons[0], 'toon-sort-indicator')[0];
    expect(indicator.textContent).toBe('▲');
    expect(indicator.getAttribute('aria-hidden')).toBe('true');
  });

  it('moves aria-sort and restores focus when a sort button is activated', () => {
    const { document } = runTableViewer();

    clickSortButton(document, 1);

    let tableContainer = document.getElementById('table');
    let headers = findByTag(tableContainer, 'th');
    expect(headers[0].getAttribute('aria-sort')).toBe('none');
    expect(headers[1].getAttribute('aria-sort')).toBe('ascending');
    expect(document.activeElement?.tagName).toBe('th');
    expect(document.activeElement?.querySelector('[data-sort-index="1"]')).toBeDefined();
    expect(getFirstBodyRowCells(tableContainer)).toEqual(['1', 'Alice']);

    clickSortButton(document, 1);

    tableContainer = document.getElementById('table');
    headers = findByTag(tableContainer, 'th');
    expect(headers[1].getAttribute('aria-sort')).toBe('descending');
    expect(document.activeElement?.tagName).toBe('th');
    expect(document.activeElement?.querySelector('[data-sort-index="1"]')).toBeDefined();
    expect(getFirstBodyRowCells(tableContainer)).toEqual(['2', 'Bob']);
  });

  it('defines a visible keyboard focus style for sort buttons', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '../../media/tableViewer.css'), 'utf8');

    expect(css).toContain('.toon-sort-button:focus-visible');
    expect(css).toContain('outline: 2px solid var(--vscode-focusBorder)');
  });
});

function runTableViewer(): { document: FakeDocument; messages: unknown[] } {
  const document = new FakeDocument();
  const messages: unknown[] = [];
  const script = fs.readFileSync(path.resolve(__dirname, '../../media/tableViewer.js'), 'utf8');
  const context = {
    acquireVsCodeApi: () => ({
      postMessage: (message: unknown) => {
        messages.push(message);
      },
    }),
    document,
    window: {
      __TOON_TABLE_DATA__: [
        {
          name: 'users',
          declaredRows: 2,
          fields: ['id', 'name'],
          rows: [
            ['2', 'Bob'],
            ['1', 'Alice'],
          ],
        },
      ],
    },
  };

  vm.runInNewContext(script, context);
  return { document, messages };
}

function clickSortButton(document: FakeDocument, index: number): void {
  const tableContainer = document.getElementById('table');
  const button = findByTag(tableContainer, 'button').find(
    (candidate) => candidate.getAttribute('data-sort-index') === String(index)
  );
  expect(button).toBeDefined();
  button?.dispatchEvent({ type: 'click' });
}

function getFirstBodyRowCells(tableContainer: FakeElement): string[] {
  const tbody = findByTag(tableContainer, 'tbody')[0];
  const firstRow = findByTag(tbody, 'tr')[0];
  return findByTag(firstRow, 'td').map((cell) => cell.textContent);
}

function findByTag(root: FakeElement, tagName: string): FakeElement[] {
  return findDescendants(root, (element) => element.tagName === tagName.toLowerCase());
}

function findByClass(root: FakeElement, className: string): FakeElement[] {
  return findDescendants(root, (element) => element.className.split(/\s+/).includes(className));
}

function findDescendants(
  root: FakeElement,
  predicate: (element: FakeElement) => boolean
): FakeElement[] {
  const matches: FakeElement[] = [];
  for (const child of root.children) {
    if (predicate(child)) {
      matches.push(child);
    }
    matches.push(...findDescendants(child, predicate));
  }
  return matches;
}

class FakeDocument {
  activeElement: FakeElement | undefined;
  private readonly elementsById = new Map<string, FakeElement>();

  constructor() {
    ['blockSelect', 'filter', 'table', 'summary', 'exportCsv'].forEach((id) => {
      this.elementsById.set(id, new FakeElement('div', this));
    });
  }

  getElementById(id: string): FakeElement {
    const element = this.elementsById.get(id);
    if (!element) {
      throw new Error(`Missing fixture element: ${id}`);
    }
    return element;
  }

  createElement(tagName: string): FakeElement {
    return new FakeElement(tagName, this);
  }
}

class FakeElement {
  readonly tagName: string;
  readonly children: FakeElement[] = [];
  readonly attributes = new Map<string, string>();
  readonly listeners = new Map<string, Array<(event: { type: string }) => void>>();
  className = '';
  colSpan = 1;
  scope = '';
  textContent = '';
  type = '';
  value = '';

  constructor(
    tagName: string,
    private readonly ownerDocument: FakeDocument
  ) {
    this.tagName = tagName.toLowerCase();
  }

  appendChild(child: FakeElement): FakeElement {
    this.children.push(child);
    return child;
  }

  replaceChildren(...children: FakeElement[]): void {
    this.children.length = 0;
    children.forEach((child) => this.appendChild(child));
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | undefined {
    return this.attributes.get(name);
  }

  hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }

  addEventListener(type: string, listener: (event: { type: string }) => void): void {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  dispatchEvent(event: { type: string }): void {
    const listeners = this.listeners.get(event.type) ?? [];
    listeners.forEach((listener) => listener.call(this, event));
  }

  focus(): void {
    this.ownerDocument.activeElement = this;
  }

  querySelector(selector: string): FakeElement | undefined {
    return this.querySelectorAll(selector).at(0);
  }

  querySelectorAll(selector: string): FakeElement[] {
    const dataSortMatch = /^\[data-sort-index="([^"]+)"\]$/.exec(selector);
    if (dataSortMatch) {
      const [, sortIndex] = dataSortMatch;
      return findDescendants(
        this,
        (element) => element.getAttribute('data-sort-index') === sortIndex
      );
    }
    const thMatch = /^th\.toon-th$/.exec(selector);
    if (thMatch) {
      return findDescendants(
        this,
        (element) => element.tagName === 'th' && element.className.split(/\s+/).includes('toon-th')
      );
    }
    return [];
  }
}
