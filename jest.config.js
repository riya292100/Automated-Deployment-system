module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'api-server/**/*.js',
    'build-server/**/*.js',
    'shared/**/*.js',
    's3-reverse-proxy/**/*.js',
    '!**/node_modules/**',
    '!temp-builds/**',
    '!build-server/index.js',
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 70,
      statements: 70,
    },
  },
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 30000,
  verbose: true,
  forceExit: true,
};
