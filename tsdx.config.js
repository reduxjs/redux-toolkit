const { join } = require('path')

const replace = require('rollup-plugin-replace')
const stripCode = require('rollup-plugin-strip-code')

const pkg = require('./package.json')

module.exports = {
  rollup(config, options) {
    config.output.name = 'RTK'

    const { env, format } = options
    // eslint-disable-next-line default-case
    switch (format) {
      case 'umd':
        delete config.external
        config.output.indent = false
        config.plugins.push(
          replace({
            '// UMD-DEV-ONLY: ': ''
          })
        )
        config.plugins.push(
          stripCode({
            // Remove the `require()` import of RISI so we use the import statement
            start_comment: 'START_REMOVE_UMD',
            end_comment: 'STOP_REMOVE_UMD'
          })
        )
        if (env === 'production') {
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
