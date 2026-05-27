import { serializeWebviewPayload } from '../../src/ui/tableViewerHtml';

describe('serializeWebviewPayload', () => {
  it('keeps table data parseable while escaping script-sensitive content', () => {
    const payload = [
      {
        name: 'users',
        declaredRows: 1,
        fields: ['id', 'note', 'html', 'separator'],
        rows: [
          [
            '1',
            '</script><script>alert("x")</script>',
            '<img src=x onerror=alert(1)> & "quoted"',
            'line\u2028paragraph\u2029',
          ],
        ],
      },
    ];

    const serialized = serializeWebviewPayload(payload);

    expect(JSON.parse(serialized)).toEqual(payload);
    expect(serialized).toContain('\\u003c/script\\u003e');
    expect(serialized).toContain('\\u003cimg src=x onerror=alert(1)\\u003e');
    expect(serialized).toContain('\\u0026');
    expect(serialized).toContain('\\u2028');
    expect(serialized).toContain('\\u2029');
    expect(serialized).not.toContain('</script');
    expect(serialized).not.toContain('<img');
    expect(serialized).not.toContain('>');
    expect(serialized).not.toContain('&');
    expect(serialized).not.toContain('\u2028');
    expect(serialized).not.toContain('\u2029');
  });

  it('serializes undefined payloads as null before script-context escaping', () => {
    expect(serializeWebviewPayload(undefined)).toBe('null');
  });
});
