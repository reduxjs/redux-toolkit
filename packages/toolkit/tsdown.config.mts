import * as babel from '@babel/core'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { Plugin } from 'rolldown'
import type { UserConfig as TsdownOptions } from 'tsdown'
import { defineConfig } from 'tsdown'
import type { MangleErrorsPluginOptions } from './scripts/mangleErrors.mjs'
import { mangleErrorsPlugin } from './scripts/mangleErrors.mjs'

const outputDir = path.join(import.meta.dirname, 'dist')

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
      name: 'Redux-Toolkit-Type-Definitions',
      entry: { index: 'src/index.ts' },
      onSuccess: copyUncheckedIndexed,
      format: ['esm'],
      sourcemap: false,
      dts: { emitDtsOnly: true, sourcemap: false },
      outExtensions: () => ({ dts: '.d.mts' }),
      deps: { neverBundle: [/uncheckedindexed/] },
    },
    {
      ...commonOptions,
      name: 'RTK-React-Type-Definitions',
      entry: { 'react/index': 'src/react/index.ts' },
      format: ['esm'],
      sourcemap: false,
      dts: { emitDtsOnly: true, sourcemap: false },
      outExtensions: () => ({ dts: '.d.mts' }),
      deps: { neverBundle: ['@reduxjs/toolkit', /uncheckedindexed/] },
    },
    {
      ...commonOptions,
      name: 'RTK-Query-Type-Definitions',
      entry: { 'query/index': 'src/query/index.ts' },
      format: ['esm'],
      sourcemap: false,
      dts: { emitDtsOnly: true, sourcemap: false },
      outExtensions: () => ({ dts: '.d.mts' }),
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
      format: ['esm'],
      sourcemap: false,
      dts: { emitDtsOnly: true, sourcemap: false },
      outExtensions: () => ({ dts: '.d.mts' }),
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
