/* eslint-disable import/first */
// @ts-check
import { build } from 'esbuild'
import terser from 'terser'
import rollup from 'rollup'
import path from 'path'
import fs from 'fs-extra'
import MagicString from 'magic-string'
import { appendInlineSourceMap, getLocation } from './sourcemap'
import ts from 'typescript'
import { RawSourceMap, SourceMapConsumer } from 'source-map'
import merge from 'merge-source-map'
import { extractInlineSourcemap, removeInlineSourceMap } from './sourcemap'
import type { BuildOptions } from './types'
import assert from 'assert'
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const outputDir = path.join(__dirname, '../dist')

async function bundle(options: BuildOptions) {
  const { format, minify, env, name, target } = options
  const result = await build({
    logLevel: 'silent',
    entryPoints: ['src/index.ts'],
    outfile: `dist/redux-toolkit${name}.js`,
    write: false,
    target: target ? target : 'es2015',
    sourcemap: 'inline',
    bundle: true,
    format: format === 'umd' ? 'esm' : format,
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
            const defaultPattern = /\/\* PROD_START_REMOVE_UMD[\s\S]*?\/\* PROD_STOP_REMOVE_UMD \*\//g
            const code = source.replace(defaultPattern, '')
            return {
              contents: code,
              loader: 'ts',
            }
          })
        },
      },
    ],
  })

  for (const chunk of result.outputFiles) {
    const origin = chunk.text
    const sourcemap = extractInlineSourcemap(origin)
    const result = ts.transpileModule(removeInlineSourceMap(origin), {
      compilerOptions: {
        sourceMap: true,
        module:
          format !== 'cjs' ? ts.ModuleKind.ES2015 : ts.ModuleKind.CommonJS,
        target: name.includes('.modern')
          ? ts.ScriptTarget.ES2017
          : ts.ScriptTarget.ES5,
      },
    })

    const mergedSourcemap = merge(sourcemap, result.sourceMapText)
    let code = result.outputText
    // TODO Is this used at all?
    let mapping: RawSourceMap = mergedSourcemap

    if (minify) {
      const transformResult = await terser.minify(
        appendInlineSourceMap(code, mapping),
        {
          sourceMap: { content: 'inline', asObject: true } as any,
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
    await fs.writeFile(chunk.path, code)
    await fs.writeJSON(chunk.path + '.map', mapping)
    const smc = await new SourceMapConsumer(mapping)
    const stubMap = {
      '../src/configureStore.ts': [
        `"reducer" is a required argument, and must be a function or an object of functions that can be passed to combineReducers`,
      ],
    }
    for (const [source, stubList] of Object.entries(stubMap)) {
      for (const stub of stubList) {
        const originContent = smc.sourceContentFor(source)
        const originLocation = getLocation(originContent, stub)
        const bundledPosition = getLocation(code, stub)
        const recoverLocation = smc.originalPositionFor({
          line: bundledPosition.line,
          column: bundledPosition.column,
        })
        assert.deepStrictEqual(
          source,
          recoverLocation.source,
          `sourceFile: expected ${source} but got ${recoverLocation.source}`
        )
        assert(
          Math.abs(originLocation.line - recoverLocation.line) <= 1,
          `line: expected ${originLocation.line} but got ${recoverLocation.line}`
        )
        assert(
          Math.abs(originLocation.column - recoverLocation.column) <= 1,
          `column: expected ${originLocation.column} but got ${recoverLocation.column}`
        )
      }
    }
  }
}

/**
 * since esbuild doesn't support umd, we use rollup to convert esm to umd
 */
async function buildUMD() {
  // origin
  const input = path.join(__dirname, '../dist/redux-toolkit.umd.js')
  const instance = await rollup.rollup({
    input: [input],
    onwarn(warning, warn) {
      if (warning.code === 'THIS_IS_UNDEFINED') return
      warn(warning) // this requires Rollup 0.46
    },
  })
  await instance.write({
    format: 'umd',
    name: 'RTK',
    file: 'dist/redux-toolkit.umd.js',
    sourcemap: true,
  })
  // minify
  const input2 = path.join(__dirname, '../dist/redux-toolkit.umd.min.js')

  const instance2 = await rollup.rollup({
    input: [input2],
    onwarn(warning, warn) {
      if (warning.code === 'THIS_IS_UNDEFINED') return
      warn(warning) // this requires Rollup 0.46
    },
  })
  await instance2.write({
    format: 'umd',
    name: 'RTK',
    file: 'dist/redux-toolkit.umd.min.js',
    sourcemap: true,
  })
}
async function writeEntry() {
  await fs.writeFile(
    'dist/index.js',
    `'use strict'
if (process.env.NODE_ENV === 'production') {
  module.exports = require('./redux-toolkit.cjs.production.min.js')
} else {
  module.exports = require('./redux-toolkit.cjs.development.js')
}`
  )
}

async function main() {
  console.log('dir:', outputDir)
  await fs.remove(outputDir)
  await fs.ensureDir(outputDir)
  const buildTargets: BuildOptions[] = [
    {
      format: 'cjs',
      name: '.cjs.development',
      minify: false,
      env: 'development',
    },
    {
      format: 'cjs',
      name: '.cjs.production.min',
      minify: true,
      env: 'production',
    },
    // ESM, embedded `process`, ES5 syntax: typical Webpack dev
    {
      format: 'esm',
      name: '.esm',
      minify: false,
      env: '',
    },
    // ESM, embedded `process`, ES2017 syntax: modern Webpack dev
    {
      format: 'esm',
      name: '.modern',
      target: 'es2017',
      minify: false,
      env: '',
    },
    // ESM, pre-compiled "dev", ES2017 syntax: browser development
    {
      format: 'esm',
      name: '.modern.development',
      target: 'es2017',
      minify: false,
      env: 'development',
    },
    // ESM, pre-compiled "prod", ES2017 syntax: browser prod
    {
      format: 'esm',
      name: '.modern.production.min',
      target: 'es2017',
      minify: true,
      env: 'production',
    },
    {
      format: 'umd',
      name: '.umd',
      minify: false,
      env: 'development',
    },
    {
      format: 'umd',
      name: '.umd.min',
      minify: true,
      env: 'production',
    },
  ]

  // Run builds in parallel
  const bundlePromises = buildTargets.map((options) => bundle(options))
  await Promise.all(bundlePromises)

  await sleep(500) // hack, waiting file to save
  await buildUMD()
  writeEntry()
  // addSubpath()
}

main()
