import type { Config } from 'jest';

const config: Config = {
  preset: 'react-native',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./jest-setup.ts'],
  fakeTimers: { enableGlobally: true },
};

export default config;
