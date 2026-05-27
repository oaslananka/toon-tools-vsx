const { parseToolJson } = require('../../scripts/check-publish-targets.js') as {
  parseToolJson: (output: string, source: string) => unknown;
};

describe('check-publish-targets script helpers', () => {
  it('treats empty marketplace metadata output as not found', () => {
    expect(parseToolJson('', 'VS Marketplace')).toBeUndefined();
    expect(parseToolJson('undefined\n', 'VS Marketplace')).toBeUndefined();
    expect(parseToolJson('null', 'VS Marketplace')).toBeUndefined();
  });

  it('parses marketplace metadata JSON', () => {
    expect(parseToolJson('{"versions":[{"version":"1.0.0"}]}', 'VS Marketplace')).toEqual({
      versions: [{ version: '1.0.0' }],
    });
  });

  it('reports non-JSON marketplace metadata output', () => {
    expect(() => parseToolJson('not-json', 'VS Marketplace')).toThrow(
      /VS Marketplace returned non-JSON output/
    );
  });
});
