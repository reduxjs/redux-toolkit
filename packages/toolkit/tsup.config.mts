import * as babel from '@babel/core'
import type { Plugin } from 'esbuild'
import { getBuildExtensions } from 'esbuild-extra'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { Options as TsupOptions } from 'tsup'
import { defineConfig } from 'tsup'
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

// Extract error strings, replace them with error codes, and write messages to a file
const mangleErrorsTransform: Plugin = {
  name: mangleErrorsPlugin.name,
  setup(build) {
    const { onTransform } = getBuildExtensions(build, mangleErrorsPlugin.name)

    onTransform({ loaders: ['ts', 'tsx'] }, async (args) => {
      try {
        const res = await babel.transformAsync(args.code, {
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
    })
  },
}

export default defineConfig((overrideOptions): TsupOptions[] => {
  const commonOptions = {
    splitting: false,
    sourcemap: true,
    tsconfig: path.join(import.meta.dirname, 'tsconfig.build.json'),
    external: [
      'redux',
      'react',
      'react-redux',
      'immer',
      'redux-thunk',
      'reselect',
    ],
    esbuildPlugins: [mangleErrorsTransform],
    format: ['cjs', 'esm'],
    target: ['esnext'],
    ...overrideOptions,
  } satisfies TsupOptions

  return [
    {
      ...commonOptions,
      name: 'Redux-Toolkit-Core-ESM',
      entry: {
        'redux-toolkit.modern': 'src/index.ts',
      },
      outExtension: () => ({ js: '.mjs' }),
      format: ['esm'],
    },
    {
      ...commonOptions,
      name: 'Redux-Toolkit-Nested-ESM',
      external: commonOptions.external.concat('@reduxjs/toolkit'),
      entry: {
        'react/redux-toolkit-react.modern': 'src/react/index.ts',
        'query/rtk-query.modern': 'src/query/index.ts',
        'query/react/rtk-query-react.modern': 'src/query/react/index.ts',
      },
      outExtension: () => ({ js: '.mjs' }),
      format: ['esm'],
    },
    {
      ...commonOptions,
      name: 'Redux-Toolkit-Core-CJS-Development',
      entry: {
        'cjs/redux-toolkit.development': 'src/index.ts',
      },
      outExtension: () => ({ js: '.cjs' }),
      env: {
        NODE_ENV: 'development',
      },
      format: ['cjs'],
    },
    {
      ...commonOptions,
      name: 'Redux-Toolkit-Nested-CJS-Development',
      external: commonOptions.external.concat('@reduxjs/toolkit'),
      entry: {
        'react/cjs/redux-toolkit-react.development': 'src/react/index.ts',
        'query/cjs/rtk-query.development': 'src/query/index.ts',
        'query/react/cjs/rtk-query-react.development':
          'src/query/react/index.ts',
      },
      outExtension: () => ({ js: '.cjs' }),
      env: {
        NODE_ENV: 'development',
      },
      format: ['cjs'],
    },
    {
      ...commonOptions,
      name: 'Redux-Toolkit-Core-CJS-Production',
      entry: {
        'cjs/redux-toolkit.production.min': 'src/index.ts',
      },
      outExtension: () => ({ js: '.cjs' }),
      env: {
        NODE_ENV: 'production',
      },
      minify: true,
      replaceNodeEnv: true,
      format: ['cjs'],
      onSuccess: async () => {
        await writeCommonJSEntry(
          path.join(import.meta.dirname, 'dist', 'cjs'),
          'redux-toolkit',
        )
      },
    },

    {
      ...commonOptions,
      name: 'Redux-Toolkit-Nested-CJS-Production',
      external: commonOptions.external.concat('@reduxjs/toolkit'),
      entry: {
        'react/cjs/redux-toolkit-react.production.min': 'src/react/index.ts',
        'query/cjs/rtk-query.production.min': 'src/query/index.ts',
        'query/react/cjs/rtk-query-react.production.min':
          'src/query/react/index.ts',
      },
      outExtension: () => ({ js: '.cjs' }),
      env: {
        NODE_ENV: 'production',
      },
      minify: true,
      replaceNodeEnv: true,
      format: ['cjs'],
      onSuccess: async () => {
        await writeCommonJSEntry(
          path.join(import.meta.dirname, 'dist', 'react', 'cjs'),
          'redux-toolkit-react',
        )

        await writeCommonJSEntry(
          path.join(import.meta.dirname, 'dist', 'query', 'cjs'),
          'rtk-query',
        )

        await writeCommonJSEntry(
          path.join(import.meta.dirname, 'dist', 'query', 'react', 'cjs'),
          'rtk-query-react',
        )
      },
    },

    {
      ...commonOptions,
      name: 'Redux-Toolkit-Core-Browser',
      entry: {
        'redux-toolkit.browser': 'src/index.ts',
      },
      outExtension: () => ({ js: '.mjs' }),
      platform: 'browser',
      env: {
        NODE_ENV: 'production',
      },
      minify: true,
      define: {
        process: 'undefined',
      },
      replaceNodeEnv: true,
      format: ['esm'],
    },

    {
      ...commonOptions,
      name: 'Redux-Toolkit-Nested-Browser',
      external: commonOptions.external.concat('@reduxjs/toolkit'),
      entry: {
        'react/redux-toolkit-react.browser': 'src/react/index.ts',
        'query/rtk-query.browser': 'src/query/index.ts',
        'query/react/rtk-query-react.browser': 'src/query/react/index.ts',
      },
      outExtension: () => ({ js: '.mjs' }),
      platform: 'browser',
      env: {
        NODE_ENV: 'production',
      },
      minify: true,
      define: {
        process: 'undefined',
      },
      replaceNodeEnv: true,
      format: ['esm'],
    },
    {
      ...commonOptions,
      name: 'Redux-Toolkit-Core-Legacy-ESM',
      entry: {
        'redux-toolkit.legacy-esm': 'src/index.ts',
      },
      outExtension: () => ({ js: '.js' }),
      format: ['esm'],
      target: ['es2017'],
      onSuccess: async () => {
        await fs.copyFile(
          path.join(import.meta.dirname, 'src', 'uncheckedindexed.ts'),
          path.join(outputDir, 'uncheckedindexed.ts'),
        )
      },
    },
    {
      ...commonOptions,
      name: 'Redux-Toolkit-Nexted-Legacy-ESM',
      external: commonOptions.external.concat('@reduxjs/toolkit'),
      entry: {
        'react/redux-toolkit-react.legacy-esm': 'src/react/index.ts',
        'query/rtk-query.legacy-esm': 'src/query/index.ts',
        'query/react/rtk-query-react.legacy-esm': 'src/query/react/index.ts',
      },
      outExtension: () => ({ js: '.js' }),
      format: ['esm'],
      target: ['es2017'],
      onSuccess: async () => {
        await fs.copyFile(
          path.join(import.meta.dirname, 'src', 'uncheckedindexed.ts'),
          path.join(outputDir, 'uncheckedindexed.ts'),
        )
      },
    },

    {
      ...commonOptions,
      name: 'Redux-Toolkit-Type-Definitions',
      entry: {
        index: 'src/index.ts',
      },
      dts: {
        only: true,
      },
      external: [/uncheckedindexed/],
    },

    {
      ...commonOptions,
      name: 'RTK-React-Type-Definitions',
      entry: {
        'react/index': 'src/react/index.ts',
      },
      dts: {
        only: true,
      },
      external: ['@reduxjs/toolkit', /uncheckedindexed/],
    },

    {
      ...commonOptions,
      name: 'RTK-Query-Type-Definitions',
      entry: {
        'query/index': 'src/query/index.ts',
      },
      dts: {
        only: true,
      },
      external: [
        '@reduxjs/toolkit',
        '@reduxjs/toolkit/react',
        /uncheckedindexed/,
      ],
    },

    {
      ...commonOptions,
      name: 'RTK-Query-React-Type-Definitions',
      entry: {
        'query/react/index': 'src/query/react/index.ts',
      },
      dts: {
        only: true,
      },
      external: [
        '@reduxjs/toolkit',
        '@reduxjs/toolkit/react',
        '@reduxjs/toolkit/query',
        /uncheckedindexed/,
      ],
    },
  ]
})
