/* eslint-disable import/first */
// @ts-check
import { build } from 'esbuild'
import terser from 'terser'
import rollup from 'rollup'
import path from 'path'
import fs from 'fs-extra'
import ts from 'typescript'
import type { RawSourceMap } from 'source-map'
import merge from 'merge-source-map'
import type { ExtractorResult } from '@microsoft/api-extractor'
import { Extractor, ExtractorConfig } from '@microsoft/api-extractor'
import yargs from 'yargs/yargs'

import { extractInlineSourcemap, removeInlineSourceMap } from './sourcemap'
import type { BuildOptions, EntryPointOptions } from './types'
import { appendInlineSourceMap } from './sourcemap'
import type { BuildResult } from 'esbuild'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const { argv } = yargs(process.argv)
  .option('local', {
    alias: 'l',
    type: 'boolean',
    description: 'Run API Extractor in local mode',
  })
  .option('skipExtraction', {
    alias: 's',
    type: 'boolean',
    description: 'Skip running API extractor',
  })
  .option('watch', {
    alias: 'w',
    type: 'boolean',
    description: 'Run in watch mode',
  })

const outputDir = path.join(__dirname, '../dist')

const buildTargets: BuildOptions[] = [
  {
    format: 'cjs',
    name: 'cjs.development',
    minify: false,
    env: 'development',
  },

  {
    format: 'cjs',
    name: 'cjs.production.min',
    minify: true,
    env: 'production',
  },
  // ESM, embedded `process`, ES5 syntax: typical Webpack dev
  {
    format: 'esm',
    name: 'esm',
    minify: false,
    env: '',
  },
  // ESM, embedded `process`, ES2017 syntax: modern Webpack dev
  {
    format: 'esm',
    name: 'modern',
    target: 'es2017',
    minify: false,
    env: '',
  },
  // ESM, pre-compiled "dev", ES2017 syntax: browser development
  {
    format: 'esm',
    name: 'modern.development',
    target: 'es2017',
    minify: false,
    env: 'development',
  },
  // ESM, pre-compiled "prod", ES2017 syntax: browser prod
  {
    format: 'esm',
    name: 'modern.production.min',
    target: 'es2017',
    minify: true,
    env: 'production',
  },
  {
    format: 'umd',
    name: 'umd',
    minify: false,
    env: 'development',
  },
  {
    format: 'umd',
    name: 'umd.min',
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
    globalName: 'RTK',
  },
  {
    prefix: 'rtk-query',
    folder: 'query',
    entryPoint: 'src/query/index.ts',
    extractionConfig: 'api-extractor.query.json',
    globalName: 'RTKQ',
  },
  {
    prefix: 'rtk-query-react',
    folder: 'query/react',
    entryPoint: 'src/query/react/index.ts',
    extractionConfig: 'api-extractor.query-react.json',
    globalName: 'RTKQ',
  },
]

const esVersionMappings = {
  // Don't output ES2015 - have TS convert to ES5 instead
  es2015: ts.ScriptTarget.ES5,
  es2017: ts.ScriptTarget.ES2017,
  es2018: ts.ScriptTarget.ES2018,
  es2019: ts.ScriptTarget.ES2019,
  es2020: ts.ScriptTarget.ES2020,
}

async function bundle(options: BuildOptions & EntryPointOptions) {
  const {
    format,
    minify,
    env,
    folder = '',
    prefix = 'redux-toolkit',
    name,
    target = 'es2015',
    entryPoint,
    watch,
  } = options

  const outputFolder = path.join('dist', folder)
  const outputFilename = `${prefix}.${name}.js`
  const outputFilePath = path.join(outputFolder, outputFilename)

  const result = await build({
    entryPoints: [entryPoint],
    outfile: outputFilePath,
    write: false,
    target,
    sourcemap: 'inline',
    bundle: true,
    format: format === 'umd' ? 'esm' : format,
    // Needed to prevent auto-replacing of process.env.NODE_ENV in all builds
    platform: 'neutral',
    // Needed to return to normal lookup behavior when platform: 'neutral'
    mainFields: ['browser', 'module', 'main'],
    conditions: ['browser'],
    define: env
      ? {
          'process.env.NODE_ENV': JSON.stringify(env),
        }
      : {},
    plugins: [
      {
        name: 'node_module_external',
        setup(build) {
          build.onResolve({ filter: /.*/ }, (args) => {
            if (format === 'umd') {
              return
            }
            if (args.path.startsWith('.') || args.path.startsWith('/')) {
              return undefined
            } else {
              return {
                path: args.path,
                external: true,
              }
            }
          })
          build.onLoad({ filter: /getDefaultMiddleware/ }, async (args) => {
            if (env !== 'production' || format !== 'umd') {
              return
            }
            const source = await fs.readFile(args.path, 'utf-8')
            const defaultPattern =
              /\/\* PROD_START_REMOVE_UMD[\s\S]*?\/\* PROD_STOP_REMOVE_UMD \*\//g
            const code = source.replace(defaultPattern, '')
            return {
              contents: code,
              loader: 'ts',
            }
          })
        },
      },
    ],
    ...(watch
      ? {
          watch: {
            async onRebuild(error, result) {
              if (error) {
                console.error('watch build failed:', error)
              } else {
                await buildSourceMaps({
                  target,
                  format,
                  minify,
                  result,
                })

                // This should happen after every changed bundle is output, but there isn't a good way to know
                // how much work is left... so we just rewrite it a handful of times :)
                // Additionally, the normal UMD output behavior doesn't apply to watch mode at this time,
                // so dev mode is really just targeting esm/cjs
                await writeEntry(folder, prefix)
              }
            },
          },
        }
      : {}),
  })

  await buildSourceMaps({
    target,
    format,
    minify,
    result,
  })
}

async function buildSourceMaps({
  target,
  format,
  minify,
  result,
}: Pick<BuildOptions, 'format' | 'minify'> & {
  result: BuildResult
  target: 'es2017' | 'es2015'
}) {
  for (const chunk of result.outputFiles) {
    const esVersion =
      target in esVersionMappings
        ? esVersionMappings[target]
        : ts.ScriptTarget.ES5

    const origin = chunk.text
    const sourcemap = extractInlineSourcemap(origin)
    const result = ts.transpileModule(removeInlineSourceMap(origin), {
      fileName: chunk.path,
      compilerOptions: {
        sourceMap: true,
        module:
          format !== 'cjs' ? ts.ModuleKind.ES2015 : ts.ModuleKind.CommonJS,
        target: esVersion,
      },
    })

    const mergedSourcemap = merge(sourcemap, result.sourceMapText)
    let code = result.outputText
    let mapping: RawSourceMap = mergedSourcemap

    if (minify) {
      const transformResult = await terser.minify(
        appendInlineSourceMap(code, mapping),
        {
          sourceMap: {
            content: 'inline',
            asObject: true,
            url: path.basename(chunk.path) + '.map',
          } as any,
          output: {
            comments: false,
          },
          compress: {
            keep_infinity: true,
            pure_getters: true,
            passes: 10,
          },
          ecma: 5,
          toplevel: true,
        }
      )
      code = transformResult.code
      mapping = transformResult.map as RawSourceMap
    }

    const relativePath = path.relative(process.cwd(), chunk.path)
    console.log(`Build artifact: ${relativePath}, settings: `, {
      target,
      output: ts.ScriptTarget[esVersion],
    })
    await fs.writeFile(chunk.path, code)
    await fs.writeJSON(chunk.path + '.map', mapping)
  }
}

/**
 * since esbuild doesn't support umd, we use rollup to convert esm to umd
 */
async function buildUMD(
  outputPath: string,
  prefix: string,
  globalName: string
) {
  for (let umdExtension of ['umd', 'umd.min']) {
    const input = path.join(outputPath, `${prefix}.${umdExtension}.js`)
    const instance = await rollup.rollup({
      input: [input],
      onwarn(warning, warn) {
        if (warning.code === 'THIS_IS_UNDEFINED') return
        warn(warning) // this requires Rollup 0.46
      },
    })
    await instance.write({
      format: 'umd',
      name: globalName,
      file: input,
      sourcemap: true,
      globals: {
        // These packages have specific global names from their UMD bundles
        react: 'React',
        'react-redux': 'ReactRedux',
      },
    })
  }
}

// Generates an index file to handle importing CJS dev/prod
async function writeEntry(folder: string, prefix: string) {
  await fs.writeFile(
    path.join('dist', folder, 'index.js'),
    `'use strict'
if (process.env.NODE_ENV === 'production') {
  module.exports = require('./${prefix}.cjs.production.min.js')
} else {
  module.exports = require('./${prefix}.cjs.development.js')
}`
  )
}

interface BuildArgs {
  skipExtraction?: boolean
  local: boolean
  watch?: boolean
}

async function main({
  skipExtraction = false,
  local = false,
  watch = false,
}: BuildArgs) {
  if (watch) {
    console.log('Starting bundling in watch mode...')
  }
  // Dist folder will be removed by rimraf beforehand so TSC can generate typedefs
  await fs.ensureDir(outputDir)

  for (let entryPoint of entryPoints) {
    const { folder, prefix } = entryPoint
    const outputPath = path.join('dist', folder)
    fs.ensureDirSync(outputPath)

    // Run builds in parallel
    const bundlePromises = buildTargets.map((options) =>
      bundle({
        ...options,
        ...entryPoint,
        watch,
      })
    )
    await Promise.all(bundlePromises)

    await writeEntry(folder, prefix)
  }

  // Run UMD builds after everything else so we don't have to sleep after each set
  for (let entryPoint of entryPoints) {
    const { folder } = entryPoint
    const outputPath = path.join('dist', folder)
    await buildUMD(outputPath, entryPoint.prefix, entryPoint.globalName)
  }

  // We need one additional package.json file in dist to support
  // versioned types for TS <4.1
  fs.copyFileSync(
    'src/query/react/versionedTypes/package.dist.json',
    'dist/query/react/versionedTypes/package.json'
  )

  if (!skipExtraction) {
    for (let entryPoint of entryPoints) {
      try {
        // Load and parse the api-extractor.json file
        const extractorConfig: ExtractorConfig =
          ExtractorConfig.loadFileAndPrepare(entryPoint.extractionConfig)

        console.log('Extracting API types for entry point: ', entryPoint.prefix)
        // Invoke API Extractor
        const extractorResult: ExtractorResult = Extractor.invoke(
          extractorConfig,
          {
            // Equivalent to the "--local" command-line parameter
            localBuild: local,

            // Equivalent to the "--verbose" command-line parameter
            showVerboseMessages: false,
          }
        )

        if (extractorResult.succeeded) {
          console.log(`API Extractor completed successfully`)
        } else {
          console.error(
            `API Extractor completed with ${extractorResult.errorCount} errors` +
              ` and ${extractorResult.warningCount} warnings`
          )
        }
      } catch (e) {
        console.error('API extractor crashed: ', e)
      }
    }
  }
}

const { skipExtraction, local, watch } = argv
main({ skipExtraction, local, watch })
