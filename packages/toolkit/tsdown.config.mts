import * as babel from '@babel/core'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { Plugin } from 'rolldown'
import type { UserConfig as TsdownOptions } from 'tsdown'
import { defineConfig } from 'tsdown'
import type { MangleErrorsPluginOptions } from './scripts/mangleErrors.mjs'
import { mangleErrorsPlugin } from './scripts/mangleErrors.mjs'

const outputDir = path.join(import.meta.dirname, 'dist')

async function writeCommonJSEntry(folder: string, prefix: string) {
  await fs.writeFile(
    path.join(folder, 'index.js'),
    `'use strict'
if (process.env.NODE_ENV === 'production') {
  module.exports = require('./${prefix}.production.min.cjs')
} else {
  module.exports = require('./${prefix}.development.cjs')
}`,
    { encoding: 'utf-8' },
  )
}

/**
 * tsup emitted both `.d.ts` and `.d.mts` for each entry, and the two files were
 * byte-identical. tsdown generates the declaration bundle once, so the `.d.mts`
 * is produced by copying rather than by a second (expensive) dts build.
 */
async function copyDeclarationToMjs(entryName: string) {
  await fs.copyFile(
    path.join(outputDir, `${entryName}.d.ts`),
    path.join(outputDir, `${entryName}.d.mts`),
  )
}

async function copyUncheckedIndexed() {
  await fs.copyFile(
    path.join(import.meta.dirname, 'src', 'uncheckedindexed.ts'),
    path.join(outputDir, 'uncheckedindexed.ts'),
  )
}

// Extract error strings, replace them with error codes, and write messages to a file
const mangleErrorsTransform: Plugin = {
  name: mangleErrorsPlugin.name,
  transform: {
    filter: { id: /\.tsx?$/ },
    async handler(code, id) {
      try {
        const res = await babel.transformAsync(code, {
          filename: id,
          babelrc: false,
          configFile: false,
          sourceMaps: true,
          parserOpts: {
            plugins: ['typescript', 'jsx'],
          },
          plugins: [
            [
              mangleErrorsPlugin,
              { minify: false } satisfies MangleErrorsPluginOptions,
            ],
          ],
        })

        if (res == null) {
          throw new Error('Babel transformAsync returned null')
        }

        return {
          code: res.code!,
          map: res.map!,
        }
      } catch (err) {
        console.error('Babel mangleErrors error: ', err)
        return null
      }
    },
  },
}

/**
 * The nested entry points, which are built as separate single-entry configs so
 * that Rolldown never emits shared chunks between them. This reproduces tsup's
 * `splitting: false`, for which tsdown has no equivalent option.
 */
const nestedEntryPoints = [
  { dir: 'react', source: 'src/react/index.ts', prefix: 'redux-toolkit-react' },
  { dir: 'query', source: 'src/query/index.ts', prefix: 'rtk-query' },
  {
    dir: 'query/react',
    source: 'src/query/react/index.ts',
    prefix: 'rtk-query-react',
  },
]

const externalDependencies = [
  'redux',
  'react',
  'react-redux',
  'immer',
  'redux-thunk',
  'reselect',
]

export default defineConfig((overrideOptions): TsdownOptions[] => {
  const commonOptions = {
    sourcemap: true,
    tsconfig: path.join(import.meta.dirname, 'tsconfig.build.json'),
    deps: { neverBundle: externalDependencies },
    plugins: [mangleErrorsTransform],
    target: ['esnext'],
    hash: false,
    // esbuild dropped JSDoc from the bundles; Rolldown keeps it by default,
    // which inflates every output file several times over. Legal and
    // annotation comments stay so `@__PURE__` survives for consumers.
    outputOptions: {
      comments: { jsdoc: false },
    },
    dts: false,
    ...overrideOptions,
  } satisfies TsdownOptions

  const nestedCommonOptions = {
    ...commonOptions,
    // esbuild treats subpaths of an external package as external too, but
    // Rolldown does not, so `@reduxjs/toolkit/query` etc. must be matched
    // explicitly or the nested entries inline the packages they depend on.
    deps: {
      neverBundle: [...externalDependencies, /^@reduxjs\/toolkit(\/.*)?$/],
    },
  } satisfies TsdownOptions

  return [
    {
      ...commonOptions,
      name: 'Redux-Toolkit-Core-ESM',
      entry: { 'redux-toolkit.modern': 'src/index.ts' },
      outExtensions: () => ({ js: '.mjs' }),
      format: ['esm'],
    },
    ...nestedEntryPoints.map(({ dir, source, prefix }): TsdownOptions => ({
      ...nestedCommonOptions,
      name: `Redux-Toolkit-Nested-ESM-${prefix}`,
      entry: { [`${dir}/${prefix}.modern`]: source },
      outExtensions: () => ({ js: '.mjs' }),
      format: ['esm'],
    })),

    {
      ...commonOptions,
      name: 'Redux-Toolkit-Core-CJS-Development',
      entry: { 'cjs/redux-toolkit.development': 'src/index.ts' },
      outExtensions: () => ({ js: '.cjs' }),
      env: { NODE_ENV: 'development' },
      format: ['cjs'],
    },
    ...nestedEntryPoints.map(({ dir, source, prefix }): TsdownOptions => ({
      ...nestedCommonOptions,
      name: `Redux-Toolkit-Nested-CJS-Development-${prefix}`,
      entry: { [`${dir}/cjs/${prefix}.development`]: source },
      outExtensions: () => ({ js: '.cjs' }),
      env: { NODE_ENV: 'development' },
      format: ['cjs'],
    })),

    {
      ...commonOptions,
      name: 'Redux-Toolkit-Core-CJS-Production',
      entry: { 'cjs/redux-toolkit.production.min': 'src/index.ts' },
      outExtensions: () => ({ js: '.cjs' }),
      env: { NODE_ENV: 'production' },
      minify: true,
      format: ['cjs'],
      onSuccess: async () => {
        await writeCommonJSEntry(path.join(outputDir, 'cjs'), 'redux-toolkit')
      },
    },
    ...nestedEntryPoints.map(({ dir, source, prefix }): TsdownOptions => ({
      ...nestedCommonOptions,
      name: `Redux-Toolkit-Nested-CJS-Production-${prefix}`,
      entry: { [`${dir}/cjs/${prefix}.production.min`]: source },
      outExtensions: () => ({ js: '.cjs' }),
      env: { NODE_ENV: 'production' },
      minify: true,
      format: ['cjs'],
      onSuccess: async () => {
        await writeCommonJSEntry(path.join(outputDir, dir, 'cjs'), prefix)
      },
    })),

    {
      ...commonOptions,
      name: 'Redux-Toolkit-Core-Browser',
      entry: { 'redux-toolkit.browser': 'src/index.ts' },
      outExtensions: () => ({ js: '.mjs' }),
      platform: 'browser',
      env: { NODE_ENV: 'production' },
      minify: true,
      define: { process: 'undefined' },
      format: ['esm'],
    },
    ...nestedEntryPoints.map(({ dir, source, prefix }): TsdownOptions => ({
      ...nestedCommonOptions,
      name: `Redux-Toolkit-Nested-Browser-${prefix}`,
      entry: { [`${dir}/${prefix}.browser`]: source },
      outExtensions: () => ({ js: '.mjs' }),
      platform: 'browser',
      env: { NODE_ENV: 'production' },
      minify: true,
      define: { process: 'undefined' },
      format: ['esm'],
    })),

    {
      ...commonOptions,
      name: 'Redux-Toolkit-Core-Legacy-ESM',
      entry: { 'redux-toolkit.legacy-esm': 'src/index.ts' },
      outExtensions: () => ({ js: '.js' }),
      format: ['esm'],
      target: ['es2017'],
      onSuccess: copyUncheckedIndexed,
    },
    ...nestedEntryPoints.map(({ dir, source, prefix }): TsdownOptions => ({
      ...nestedCommonOptions,
      name: `Redux-Toolkit-Nested-Legacy-ESM-${prefix}`,
      entry: { [`${dir}/${prefix}.legacy-esm`]: source },
      outExtensions: () => ({ js: '.js' }),
      format: ['esm'],
      target: ['es2017'],
    })),

    {
      ...commonOptions,
      name: 'Redux-Toolkit-Type-Definitions',
      entry: { index: 'src/index.ts' },
      onSuccess: () => copyDeclarationToMjs('index'),
      format: ['esm'],
      sourcemap: false,
      dts: { emitDtsOnly: true, sourcemap: false },
      outExtensions: () => ({ dts: '.d.ts' }),
      deps: { neverBundle: [/uncheckedindexed/] },
    },
    {
      ...commonOptions,
      name: 'RTK-React-Type-Definitions',
      entry: { 'react/index': 'src/react/index.ts' },
      onSuccess: () => copyDeclarationToMjs('react/index'),
      format: ['esm'],
      sourcemap: false,
      dts: { emitDtsOnly: true, sourcemap: false },
      outExtensions: () => ({ dts: '.d.ts' }),
      deps: { neverBundle: ['@reduxjs/toolkit', /uncheckedindexed/] },
    },
    {
      ...commonOptions,
      name: 'RTK-Query-Type-Definitions',
      entry: { 'query/index': 'src/query/index.ts' },
      onSuccess: () => copyDeclarationToMjs('query/index'),
      format: ['esm'],
      sourcemap: false,
      dts: { emitDtsOnly: true, sourcemap: false },
      outExtensions: () => ({ dts: '.d.ts' }),
      deps: {
        neverBundle: [
          '@reduxjs/toolkit',
          '@reduxjs/toolkit/react',
          /uncheckedindexed/,
        ],
      },
    },
    {
      ...commonOptions,
      name: 'RTK-Query-React-Type-Definitions',
      entry: { 'query/react/index': 'src/query/react/index.ts' },
      onSuccess: () => copyDeclarationToMjs('query/react/index'),
      format: ['esm'],
      sourcemap: false,
      dts: { emitDtsOnly: true, sourcemap: false },
      outExtensions: () => ({ dts: '.d.ts' }),
      deps: {
        neverBundle: [
          '@reduxjs/toolkit',
          '@reduxjs/toolkit/react',
          '@reduxjs/toolkit/query',
          /uncheckedindexed/,
        ],
      },
    },
  ]
})
