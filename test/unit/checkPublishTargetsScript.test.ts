const { isNotFoundError, parseToolJson, readTargetVersion } =
  require('../../scripts/check-publish-targets.js') as {
    isNotFoundError: (error: { stdout?: string; stderr?: string }) => boolean;
    parseToolJson: (output: string, source: string) => unknown;
    readTargetVersion: (argv: string[], fallbackVersion: string) => string;
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

  it('ignores the npm argument separator when reading a target version', () => {
    expect(readTargetVersion(['--', '1.0.1'], '1.0.0')).toBe('1.0.1');
    expect(readTargetVersion(['--dry-run', '1.0.1'], '1.0.0')).toBe('1.0.1');
    expect(readTargetVersion([], '1.0.0')).toBe('1.0.0');
  });

  it('treats unpublished Open VSX version output as not found', () => {
    expect(
      isNotFoundError({
        stderr: "Extension oaslananka.toon-tools-vsx has no published version matching '1.0.1'",
      })
    ).toBe(true);
  });
});
