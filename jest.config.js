/** @type {import('jest').Config} */
module.exports = {
  // Default test environment
  testEnvironment: 'node',

  // Test environment overrides for specific paths
  testEnvironmentOptions: {
    url: 'http://localhost',
  },

  // Test file matching patterns
  testMatch: ['**/tests/**/*.test.[jt]s?(x)'],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js'],

  // Module handling
  moduleFileExtensions: ['js', 'jsx', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },

  // Transform configuration
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!**/node_modules/**',
    '!**/vendor/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/coverage/**',
    '!**/public/**',
  ],
  coverageReporters: ['text', 'lcov', 'clover'],

  // Ignore patterns
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  transformIgnorePatterns: ['/node_modules/(?!(your-module-to-transform|another-module)/)'],

  // Global test timeout
  testTimeout: 10000,

  // Run tests in band to avoid port conflicts
  maxWorkers: 1,
  maxConcurrency: 1,

  // Watch plugins temporarily disabled due to dependency conflicts
  // watchPlugins: [
  //   'jest-watch-typeahead/filename',
  //   'jest-watch-typeahead/testname',
  // ],

  // Global teardown
  globalTeardown: '<rootDir>/tests/setup/globalTeardown.js',
};
