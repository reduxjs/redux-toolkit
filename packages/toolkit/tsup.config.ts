import * as babel from '@babel/core'
import type { Plugin } from 'esbuild'
import { getBuildExtensions } from 'esbuild-extra'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Options as TsupOptions } from 'tsup'
import { defineConfig } from 'tsup'

// No __dirname under Node ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const outputDir = path.join(__dirname, 'dist')

export interface BuildOptions {
  format: 'cjs' | 'esm'
  name:
    | 'development'
    | 'production.min'
    | 'legacy-esm'
    | 'modern'
    | 'browser'
    | 'umd'
    | 'umd.min'
  minify: boolean
  env: 'development' | 'production' | ''
  target?:
    | 'es2017'
    | 'es2018'
    | 'es2019'
    | 'es2020'
    | 'es2021'
    | 'es2022'
    | 'esnext'
}

export interface EntryPointOptions {
  prefix: string
  folder: string
  entryPoint: string
  extractionConfig: string
  externals?: string[]
}

const buildTargets: BuildOptions[] = [
  {
    format: 'cjs',
    name: 'development',
    target: 'esnext',
    minify: false,
    env: 'development',
  },
  {
    format: 'cjs',
    name: 'production.min',
    target: 'esnext',
    minify: true,
    env: 'production',
  },
  // ESM, embedded `process`: modern Webpack dev
  {
    format: 'esm',
    name: 'modern',
    target: 'esnext',
    minify: false,
    env: '',
  },
  // ESM, embedded `process`: fallback for Webpack 4,
  // which doesn't support `exports` field or optional chaining
  {
    format: 'esm',
    name: 'legacy-esm',
    target: 'esnext',
    minify: false,
    env: '',
  },
  // ESM, pre-compiled "prod": browser prod
  {
    format: 'esm',
    name: 'browser',
    target: 'esnext',
    minify: true,
    env: 'production',
  },
]

const entryPoints: EntryPointOptions[] = [
  {
    prefix: 'redux-toolkit',
    folder: '',
    entryPoint: 'src/index.ts',
    extractionConfig: 'api-extractor.json',
  },
  {
    prefix: 'redux-toolkit-react',
    folder: 'react/',
    entryPoint: 'src/react/index.ts',
    extractionConfig: 'api-extractor-react.json',
    externals: ['redux', '@reduxjs/toolkit'],
  },
  {
    prefix: 'rtk-query',
    folder: 'query',
    entryPoint: 'src/query/index.ts',
    extractionConfig: 'api-extractor.query.json',
    externals: ['redux', '@reduxjs/toolkit'],
  },
  {
    prefix: 'rtk-query-react',
    folder: 'query/react',
    entryPoint: 'src/query/react/index.ts',
    extractionConfig: 'api-extractor.query-react.json',
    externals: ['redux', '@reduxjs/toolkit'],
  },
]

function writeCommonJSEntry(folder: string, prefix: string) {
  fs.writeFileSync(
    path.join(folder, 'index.js'),
    `'use strict'
if (process.env.NODE_ENV === 'production') {
  module.exports = require('./${prefix}.production.min.cjs')
} else {
  module.exports = require('./${prefix}.development.cjs')
}`
  )
}

// Extract error strings, replace them with error codes, and write messages to a file
const mangleErrorsTransform: Plugin = {
  name: 'mangle-errors-plugin',
  setup(build) {
    const { onTransform } = getBuildExtensions(build, 'mangle-errors-plugin')

    onTransform({ loaders: ['ts', 'tsx'] }, async (args) => {
      try {
        const res = babel.transformSync(args.code, {
          parserOpts: {
            plugins: ['typescript', 'jsx'],
          },
          plugins: [['./scripts/mangleErrors.cjs', { minify: false }]],
        })!
        return {
          code: res.code!,
          map: res.map!,
        }
      } catch (err) {
        console.error('Babel mangleErrors error: ', err)
        return null
      }
    })
  },
}

const tsconfig: NonNullable<TsupOptions['tsconfig']> = path.join(
  __dirname,
  './tsconfig.build.json'
)

export default defineConfig((options) => {
  const configs = entryPoints
    .map((entryPointConfig) => {
      const artifactOptions: TsupOptions[] = buildTargets.map((buildTarget) => {
        const { prefix, folder, entryPoint, externals } = entryPointConfig
        const { format, minify, env, name, target } = buildTarget
        const outputFilename = `${prefix}.${name}`

        const folderSegments = [outputDir, folder]
        if (format === 'cjs') {
          folderSegments.push('cjs')
        }

        const outputFolder = path.join(...folderSegments)

        const extension =
          name === 'legacy-esm' ? '.js' : format === 'esm' ? '.mjs' : '.cjs'

        const defineValues: Record<string, string> = {}

        if (env) {
          Object.assign(defineValues, {
            'process.env.NODE_ENV': JSON.stringify(env),
          })
        }

        const generateTypedefs = name === 'modern' && format === 'esm'

        return {
          entry: {
            [outputFilename]: entryPoint,
          },
          format,
          tsconfig,
          outDir: outputFolder,
          target,
          outExtension: () => ({ js: extension }),
          minify,
          sourcemap: true,
          external: externals,
          esbuildPlugins: [mangleErrorsTransform],
          esbuildOptions(options) {
            // Needed to prevent auto-replacing of process.env.NODE_ENV in all builds
            options.platform = 'neutral'
            // Needed to return to normal lookup behavior when platform: 'neutral'
            options.mainFields = ['browser', 'module', 'main']
            options.conditions = ['browser']
          },

          define: defineValues,
          async onSuccess() {
            if (format === 'cjs' && name === 'production.min') {
              writeCommonJSEntry(outputFolder, prefix)
            } else if (generateTypedefs) {
              if (folder === '') {
                // we need to delete the declaration file and replace it with the original source file
                fs.rmSync(path.join(outputFolder, 'uncheckedindexed.d.ts'))

                fs.copyFileSync(
                  'src/uncheckedindexed.ts',
                  path.join(outputFolder, 'uncheckedindexed.ts')
                )
              }
              // TODO Copy/generate `.d.mts` files?
              // const inputTypedefsFile = `${outputFilename}.d.ts`
              // const outputTypedefsFile = `${outputFilename}.d.mts`
              // const inputTypedefsPath = path.join(
              //   outputFolder,
              //   inputTypedefsFile
              // )
              // const outputTypedefsPath = path.join(
              //   outputFolder,
              //   outputTypedefsFile
              // )
              // while (!fs.existsSync(inputTypedefsPath)) {
              //   // console.log(
              //   //   'Waiting for typedefs to be generated: ' + inputTypedefsFile
              //   // )
              //   await delay(100)
              // }
              // fs.copyFileSync(inputTypedefsPath, outputTypedefsPath)
            }
          },
        }
      })

      return artifactOptions
    })
    .flat()

  return configs
})
