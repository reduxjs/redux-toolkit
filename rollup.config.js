import resolve from 'rollup-plugin-node-resolve'
import babel from 'rollup-plugin-babel'
import commonjs from 'rollup-plugin-commonjs'
import replace from 'rollup-plugin-replace'
import stripCode from "rollup-plugin-strip-code"
import { terser } from 'rollup-plugin-terser'

import pkg from './package.json'

const input = './src/index.ts'
const exclude = 'node_modules/**'

const extensions = ['.ts', '.js']


export default [
  // UMD Development
  {
    input,
    output: {
      file: 'dist/redux-starter-kit.umd.js',
      format: 'umd',
      name: 'RSK',
      indent: false
    },
    plugins: [
      resolve({
        jsnext: true
      }),
      babel({
        extensions,
        exclude,
      }),
      replace({
        'process.env.NODE_ENV': JSON.stringify('development'),
        // Uncomment the import of redux-immutable-state-invariant so it gets pulled into this build
        "// UMD-DEV-ONLY: ": "",
      }),
      stripCode({
        // Remove the `require()` import of RISI so we use the import statement
        start_comment: 'START_REMOVE_UMD',
        end_comment: 'STOP_REMOVE_UMD'
      }),
      commonjs({
        extensions,
        namedExports: {
          'node_modules/curriable/dist/curriable.js': ['curry', '__']
        }
      })
    ]
  },

  // UMD Production
  {
    input,
    output: {
      file: 'dist/redux-starter-kit.umd.min.js',
      format: 'umd',
      name: 'RSK',
      indent: false
    },
    plugins: [
      replace({
        'process.env.NODE_ENV': JSON.stringify('production'),
      }),
      resolve({
        jsnext: true
      }),
      babel({
        extensions,
        exclude,
      }),
      commonjs({
        extensions,
        namedExports: {
          'node_modules/curriable/dist/curriable.js': ['curry', '__']
        }
      }),
      terser({
        compress: {
          pure_getters: true,
          unsafe: true,
          unsafe_comps: true,
          warnings: false
        },
      })
    ]
  },

  // CommonJS (for Node) and ES module (for bundlers) build.
  // (We could have three entries in the configuration array
  // instead of two, but it's quicker to generate multiple
  // builds from a single configuration where possible, using
  // the `targets` option which can specify `dest` and `format`)
  {
    input,
    output: [
      { file: pkg.main, format: 'cjs' },
      { file: pkg.module, format: 'es' }
    ],
    external: Object.keys(pkg.dependencies),
    plugins: [
      babel({
        extensions,
        exclude
      }),
      resolve({
        extensions
      })
    ]
  }
]
