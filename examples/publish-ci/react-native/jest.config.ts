import type { Config } from "jest"

const config: Config = {
  preset: "react-native",
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/jest-setup.ts"],
  fakeTimers: { enableGlobally: true },
}

export default config
