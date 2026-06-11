import {
  DEFAULT_INTEGRATION_TEST_VSCODE_VERSION,
  createTestEnvironment,
  resolveIntegrationTestVSCodeVersion,
} from '../integration/runTest';

describe('integration test runner environment', () => {
  it('does not launch VS Code as a Node process', () => {
    const environment = createTestEnvironment({
      ELECTRON_RUN_AS_NODE: '1',
      PATH: 'test-path',
    });

    expect(environment).toEqual({ PATH: 'test-path' });
  });

  it('pins VS Code integration tests to the supported API floor by default', () => {
    expect(resolveIntegrationTestVSCodeVersion({})).toBe(DEFAULT_INTEGRATION_TEST_VSCODE_VERSION);
    expect(
      resolveIntegrationTestVSCodeVersion({
        TOON_TOOLS_TEST_VSCODE_VERSION: ' 1.91.0 ',
      })
    ).toBe('1.91.0');
  });
});
