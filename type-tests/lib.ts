import { check } from 'typings-tester'
import { versionMajorMinor, sys, findConfigFile } from 'typescript'

export const tsVersion = Number.parseFloat(versionMajorMinor)

export const testIf = (condition: boolean) => (condition ? test : test.skip)

export function checkDirectory(path: string, bail: boolean = false, depth = 1) {
  const files = sys.readDirectory(path, ['.ts', '.tsx'], [], [], depth)
  const tsConfigPath = findConfigFile(path, sys.fileExists)

  if (!tsConfigPath) {
    throw new Error(`Cannot find TypeScript config file in ${path}.`)
  }

  check(files, tsConfigPath, bail)
}
