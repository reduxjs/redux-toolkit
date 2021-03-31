module.exports = {
  setupFilesAfterEnv: ['./jest.setup.js'],
  transform: {
    '.(ts|tsx)$': require.resolve('ts-jest/dist'),
    '.(js|jsx)$': require.resolve('babel-jest') // jest's default
  },
  transformIgnorePatterns: ['[/\\\\]node_modules[/\\\\].+\\.(js|jsx)$'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'node'],
  collectCoverageFrom: ['src/**/*.{ts,tsx,js,jsx}'],
  testMatch: ['<rootDir>/**/*.(spec|test).{ts,tsx,js,jsx}'],
  testURL: 'http://localhost',
  rootDir: process.cwd(),
  watchPlugins: [
    require.resolve('jest-watch-typeahead/filename'),
    require.resolve('jest-watch-typeahead/testname')
  ],
  globals: {
    'ts-jest': {
      diagnostics: {
        ignoreCodes: [6133]
      }
    }
  }
}
