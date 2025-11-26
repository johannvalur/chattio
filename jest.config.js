/** @type {import('jest').Config} */
module.exports = {
	testEnvironment: 'jsdom',
	testMatch: ['**/tests/**/*.test.[jt]s?(x)'],
	setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js'],
	moduleFileExtensions: ['js', 'json']
};

