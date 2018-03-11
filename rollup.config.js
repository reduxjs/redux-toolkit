import resolve from 'rollup-plugin-node-resolve'
import babel from 'rollup-plugin-babel'
import commonjs from 'rollup-plugin-commonjs'
import pkg from './package.json'

export default [
  // browser-friendly UMD build
  // If we aim to support legacy browsers such as IE, Safari <10 or Opera Mini
  // we must transpile back to ES5
  {
    input: 'src/index.js',
    output: { name: 'redux-starter-kit', file: pkg.browser, format: 'umd' },
    plugins: [babel({ exclude: 'node_modules/**' }), resolve(), commonjs()]
  },

  // CommonJS (for Node)
  // Most webpack config skip transpiling node_modules code by default
  // If we aim to support legacy browsers such as IE, Safari <10 or Opera Mini
  // we must transpile back to ES5
  {
    input: 'src/index.js',
    output: { file: pkg.main, format: 'cjs' },
    plugins: [babel({ exclude: 'node_modules/**' })]
  },

  // ES module (for bundlers) build.
  // It is assumed that in this case the bundler will perform expected
  // transpilations so we can deliver ES6+ code
  {
    input: 'src/index.js',
    output: { file: pkg.module, format: 'es' }
  }
]
