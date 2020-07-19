const { join } = require('path')

const { nodeResolve } = require('@rollup/plugin-node-resolve')
const babel = require('rollup-plugin-babel')
const replace = require('@rollup/plugin-replace')
const typescript = require('rollup-plugin-typescript2')
const { terser } = require('rollup-plugin-terser')

const stripCode = require('rollup-plugin-strip-code')

const pkg = require('./package.json')

module.exports = {
  rollup(config, options) {
    config.output.name = 'RTK'

    const { env, format } = options
    // eslint-disable-next-line default-case
    switch (format) {
      case 'system':
        const extensions = ['.ts']

        config.input = 'src/index.ts'
        config.output = {
          file: 'dist/redux-toolkit.min.mjs',
          format: 'es',
          indent: false
        }
        config.plugins = [
          nodeResolve({
            extensions
          }),
          replace({
            'process.env.NODE_ENV': JSON.stringify('production')
          }),
          typescript({
            tsconfigOverride: { compilerOptions: { declaration: false } }
          }),
          babel({
            extensions,
            exclude: 'node_modules/**'
          }),
          terser({
            compress: {
              pure_getters: true,
              unsafe: true,
              unsafe_comps: true,
              warnings: false
            }
          })
        ]
      case 'umd':
        delete config.external
        config.output.indent = false
        if (env === 'production') {
          config.plugins.unshift(
            stripCode({
              start_comment: 'PROD_START_REMOVE_UMD',
              end_comment: 'PROD_STOP_REMOVE_UMD'
            })
          )
          config.output.file = join(__dirname, pkg.unpkg)
        } else {
          config.output.file = config.output.file.replace(
            'umd.development',
            'umd'
          )
        }
        break
    }
    return config
  }
}
