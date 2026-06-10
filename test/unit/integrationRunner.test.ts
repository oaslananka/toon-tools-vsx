import { createTestEnvironment } from '../integration/runTest';

describe('integration test runner environment', () => {
  it('does not launch VS Code as a Node process', () => {
    const environment = createTestEnvironment({
      ELECTRON_RUN_AS_NODE: '1',
      PATH: 'test-path',
    });

    expect(environment).toEqual({ PATH: 'test-path' });
  });
});
