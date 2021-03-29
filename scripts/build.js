const { build } = require('esbuild')
const rollup = require('rollup')
const path = require('path')
const fs = require('fs-extra')
const ts = require('typescript')
const { fromJSON } = require('convert-source-map')
const merge = require('merge-source-map')
const { extractInlineSourcemap, removeInlineSourceMap } = require('./sourcemap')
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
async function bundle(env, format) {
  let envName = env
  if (env === 'production') {
    envName = 'production.'
  } else if (format === 'cjs') {
    envName = 'development.'
  } else {
    envName = ''
  }
  const result = await build({
    entryPoints: ['src/index.ts'],
    outfile: `dist/redux-toolkit.${format}.${envName}js`,
    write: false,
    target: 'es2015',
    minify: env === 'production',
    sourcemap: 'inline',
    bundle: true,
    format: format === 'umd' ? 'esm' : format,
    define: {
      'process.env.NODE_ENV': JSON.stringify(env),
    },
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
    const code = ts.transpileModule(removeInlineSourceMap(origin), {
      compilerOptions: {
        sourceMap: true,
        module:
          format === 'umd' ? ts.ModuleKind.ES2015 : ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES5,
      },
    })
    const mergedSourcemap = merge(sourcemap, code.sourceMapText)

    await fs.writeFile(chunk.path, code.outputText)
    await fs.writeJSON(chunk.path + '.map', mergedSourcemap)
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
    name: 'redux-toolkit',
    file: 'dist/redux-toolkit.umd.js',
    sourcemap: true,
  })
  // minify
  const input2 = path.join(__dirname, '../dist/redux-toolkit.umd.production.js')

  const instance2 = await rollup.rollup({
    input: [input2],
    onwarn(warning, warn) {
      if (warning.code === 'THIS_IS_UNDEFINED') return
      warn(warning) // this requires Rollup 0.46
    },
  })
  await instance2.write({
    format: 'umd',
    name: 'redux-toolkit',
    file: 'dist/redux-toolkit.umd.min.js',
    sourcemap: true,
  })
  try {
    await fs.unlinkSync(input2)
    await fs.unlinkSync(input2 + '.map')
  } catch (err) {
    // just ignore
  }
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
async function addSubpath() {}
async function main() {
  for (const format of ['cjs', 'esm', 'umd']) {
    for (const env of ['development', 'production']) {
      bundle(env, format)
    }
  }
  await sleep(2000) // hack, waiting file to save
  await buildUMD()
  writeEntry()
  addSubpath()
}

main()
