const dependabotBumpPattern = /^Bump .+/m;
const dependabotSignedOffByPattern = /Signed-off-by: dependabot\[bot\] <support@github\.com>/;

const isDependabotBump = (message) =>
  dependabotBumpPattern.test(message) && dependabotSignedOffByPattern.test(message);

module.exports = {
  extends: ['@commitlint/config-conventional'],
  ignores: [isDependabotBump],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'chore',
        'build',
        'ci',
        'revert',
        'security',
      ],
    ],
    'subject-case': [0],
    'body-max-line-length': [0],
  },
};
