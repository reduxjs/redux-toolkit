import resolve from 'rollup-plugin-node-resolve'
import babel from 'rollup-plugin-babel'
import commonjs from 'rollup-plugin-commonjs'
import replace from 'rollup-plugin-replace'
import pkg from './package.json'

const input = 'src/index'
const exclude = 'node_modules/**'

export default [
  // browser-friendly UMD build
  {
    input,
    output: {
      name: 'redux-starter-kit',
      file: pkg.unpkg,
      format: 'umd'
    },
    plugins: [
      babel({
        exclude: 'node_modules/**'
      }),
      resolve(),
      replace({
        'process.env.NODE_ENV': JSON.stringify('development')
      }),
      commonjs({
        namedExports: {
          'node_modules/curriable/dist/curriable.js': ['curry', '__']
        }
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
    plugins: babel({ exclude })
  }
]
