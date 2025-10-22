import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { generateApi } from './generate'
import type {
  CommonOptions,
  ConfigFile,
  GenerationOptions,
  OutputFileOptions,
} from './types'
import { isValidUrl, prettify } from './utils'
export type { ConfigFile } from './types'

const require = createRequire(__filename)

export async function generateEndpoints(
  options: GenerationOptions,
): Promise<string | void> {
  const schemaLocation = options.schemaFile

  const schemaAbsPath = isValidUrl(options.schemaFile)
    ? options.schemaFile
    : path.resolve(process.cwd(), schemaLocation)

  const sourceCode = await enforceOazapftsTsVersion(async () => {
    return generateApi(schemaAbsPath, options)
  })
  const { outputFile, prettierConfigFile } = options
  if (outputFile) {
    fs.writeFileSync(
      path.resolve(process.cwd(), outputFile),
      await prettify(outputFile, sourceCode, prettierConfigFile),
    )
  } else {
    return await prettify(null, sourceCode, prettierConfigFile)
  }
}

export function parseConfig(fullConfig: ConfigFile) {
  const outFiles: (CommonOptions & OutputFileOptions)[] = []

  if ('outputFiles' in fullConfig) {
    const { outputFiles, ...commonConfig } = fullConfig
    for (const [outputFile, specificConfig] of Object.entries(outputFiles)) {
      outFiles.push({
        ...commonConfig,
        ...specificConfig,
        outputFile,
      })
    }
  } else {
    outFiles.push(fullConfig)
  }
  return outFiles
}

/**
 * Enforces `oazapfts` to use the same TypeScript version as this module itself uses.
 * That should prevent enums from running out of sync if both libraries use different TS versions.
 */
function enforceOazapftsTsVersion<T>(cb: () => T): T {
  const ozTsPath = require.resolve('typescript', {
    paths: [require.resolve('oazapfts')],
  })
  const tsPath = require.resolve('typescript')
  const originalEntry = require.cache[ozTsPath]
  try {
    require.cache[ozTsPath] = require.cache[tsPath]
    return cb()
  } finally {
    if (originalEntry) {
      require.cache[ozTsPath] = originalEntry
    } else {
      delete require.cache[ozTsPath]
    }
  }
}
