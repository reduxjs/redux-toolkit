const { join } = require('path')

const stripCode = require('rollup-plugin-strip-code')

const pkg = require('./package.json')

module.exports = {
  rollup(config, options) {
    config.output.name = 'RTK'

    const { env, format } = options

    // eslint-disable-next-line default-case
    switch (format) {
      case 'system':
        delete config.external
        config.input = 'src/index.ts'
        config.output = {
          file: 'dist/redux-toolkit.esm.production.mjs',
          format: 'es',
          indent: false
        }
        if (env === 'production') {
          config.plugins.unshift([
            stripCode({
              start_comment: 'PROD_START_REMOVE_UMD',
              end_comment: 'PROD_STOP_REMOVE_UMD'
            })
          ])
        } else {
          config.output.file = config.output.file.replace(
            'production',
            'development'
          )
        }
        break

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
