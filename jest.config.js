module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'api-server/**/*.js',
    'build-server/builder.js',
    'shared/**/*.js',
    's3-reverse-proxy/**/*.js',
    '!**/node_modules/**',
    '!temp-builds/**',
  ],
  coverageThreshold: {
    global: {
      branches: 45,
      functions: 60,
      lines: 70,
      statements: 65,
    },
  },
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 30000,
  verbose: true,
  forceExit: true,
};
