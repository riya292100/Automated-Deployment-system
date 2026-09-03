const globals = {
  // Node globals
  require: 'readonly',
  module: 'readonly',
  exports: 'readonly',
  process: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  Buffer: 'readonly',
  console: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',

  // Browser & Service Worker globals
  window: 'readonly',
  document: 'readonly',
  fetch: 'readonly',
  EventSource: 'readonly',
  Event: 'readonly',
  alert: 'readonly',
  navigator: 'readonly',
  FileReader: 'readonly',
  self: 'readonly',
  caches: 'readonly',
  URL: 'readonly',
  Response: 'readonly',
  Request: 'readonly',
  Headers: 'readonly',

  // Jest test globals
  describe: 'readonly',
  test: 'readonly',
  it: 'readonly',
  expect: 'readonly',
  beforeAll: 'readonly',
  afterAll: 'readonly',
  beforeEach: 'readonly',
  afterEach: 'readonly',
  jest: 'readonly',
};

export default [
  {
    ignores: [
      'node_modules/**',
      'coverage/**',
      'temp-builds/**',
      'storage/**',
      'sample-projects/**',
      '.git/**',
    ],
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals,
    },
    rules: {
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-undef': 'error',
      'no-constant-condition': 'warn',
    },
  },
];
