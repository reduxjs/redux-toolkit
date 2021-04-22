module.exports = {
  setupFilesAfterEnv: ['./jest.setup.js'],
  testPathIgnorePatterns: ['<rootDir>/query-old/*'],
  moduleNameMapper: {
    '^@reduxjs/toolkit$': '<rootDir>/src/index.ts',
    '^@reduxjs/toolkit/query$': '<rootDir>/src/query/index.ts',
    '^@reduxjs/toolkit/query/react$': '<rootDir>/src/query/react.ts',
    '^@internal/(.*)$': '<rootDir>/src/query/*',
  },
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.test.json',
    },
  },
}
