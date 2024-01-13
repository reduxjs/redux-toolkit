const webpack = require('webpack')
let { join } = require('path')

const esmSuffixes = ['modern.mjs', 'browser.mjs', 'legacy-esm.js']
const cjsSuffixes = ['development.cjs', 'production.min.cjs']

function withRtkPath(suffix, cjs = false) {
  /**
   * @param {webpack.Configuration} config
   */
  return (config) => {
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /@reduxjs\/toolkit\/query\/react/,
        join(__dirname, `query/react`)
      ),
      new webpack.NormalModuleReplacementPlugin(
        /@reduxjs\/toolkit\/query/,
        join(__dirname, `query`)
      ),
      new webpack.NormalModuleReplacementPlugin(
        /@reduxjs\/toolkit\/react/,
        join(__dirname, 'react')
      ),
      new webpack.NormalModuleReplacementPlugin(
        /@reduxjs\/toolkit/,
        join(__dirname)
      ),
      new webpack.NormalModuleReplacementPlugin(
        /rtk-query-react.modern.js/,
        (r) => {
          const old = r.request
          r.request = r.request.replace(
            /rtk-query-react.modern.js$/,
            `${cjs ? 'cjs/' : ''}rtk-query-react.${suffix}`
          )
          // console.log(old, '=>', r.request)
        }
      ),
      new webpack.NormalModuleReplacementPlugin(/rtk-query.modern.js/, (r) => {
        const old = r.request
        r.request = r.request.replace(
          /rtk-query.modern.js$/,
          `${cjs ? 'cjs/' : ''}rtk-query.${suffix}`
        )
        // console.log(old, '=>', r.request)
      }),
      new webpack.NormalModuleReplacementPlugin(
        /redux-toolkit-react.modern.js$/,
        (r) => {
          const old = r.request
          r.request = r.request.replace(
            /redux-toolkit-react.modern.js$/,
            `${cjs ? 'cjs/' : ''}redux-toolkit-react.${suffix}`
          )
          // console.log(old, '=>', r.request)
        }
      ),
      new webpack.NormalModuleReplacementPlugin(
        /redux-toolkit.modern.js$/,
        (r) => {
          const old = r.request
          r.request = r.request.replace(
            /redux-toolkit.modern.js$/,
            `${cjs ? 'cjs/' : ''}redux-toolkit.${suffix}`
          )
          // console.log(old, '=>', r.request)
        }
      )
    )
    if (suffix === 'production.min.cjs') {
      ;(config.resolve ??= {}).mainFields = ['main', 'module']
    }
    ;(config.optimization ??= {}).nodeEnv = 'production'
    return config
  }
}

const ignoreAll = [
  '@reduxjs/toolkit',
  '@reduxjs/toolkit/query',
  'immer',
  'redux',
  'reselect',
  'redux-thunk',
]

const entryPoints = [
  {
    name: `1. entry point: @reduxjs/toolkit`,
    path: 'dist/redux-toolkit.modern.mjs',
  },
  {
    name: `1. entry point: @reduxjs/toolkit/react`,
    path: 'dist/react/redux-toolkit-react.modern.mjs',
  },
  {
    name: `1. entry point: @reduxjs/toolkit/query`,
    path: 'dist/query/rtk-query.modern.mjs',
  },
  {
    name: `1. entry point: @reduxjs/toolkit/query/react`,
    path: 'dist/query/react/rtk-query-react.modern.mjs',
  },
  {
    name: `2. entry point: @reduxjs/toolkit (without dependencies)`,
    path: 'dist/redux-toolkit.modern.mjs',
    ignore: ignoreAll,
  },
  {
    name: `2. entry point: @reduxjs/toolkit/react (without dependencies)`,
    path: 'dist/react/redux-toolkit-react.modern.mjs',
    ignore: ignoreAll,
  },
  {
    name: `2. entry point: @reduxjs/toolkit/query (without dependencies)`,
    path: 'dist/query/rtk-query.modern.mjs',
    ignore: ignoreAll,
  },
  {
    name: `2. entry point: @reduxjs/toolkit/query/react (without dependencies)`,
    path: 'dist/query/react/rtk-query-react.modern.mjs',
    ignore: ignoreAll,
  },
]

module.exports = entryPoints
  .flatMap((e) =>
    esmSuffixes.map((suffix) => ({
      ...e,
      name: e.name + ` (${suffix})`,
      modifyWebpackConfig: withRtkPath(suffix),
    }))
  )
  .concat(
    entryPoints.flatMap((e) =>
      cjsSuffixes.map((suffix) => ({
        ...e,
        name: e.name + ` (cjs, ${suffix})`,
        modifyWebpackConfig: withRtkPath(suffix, true),
      }))
    )
  )
  .concat(
    ...[
      {
        name: `3. createSlice`,
        import: { '@reduxjs/toolkit': '{ createSlice }' },
      },
      {
        name: `3. createEntityAdapter`,
        import: { '@reduxjs/toolkit': '{ createEntityAdapter }' },
      },
      {
        name: `3. configureStore`,
        import: { '@reduxjs/toolkit': '{ configureStore }' },
      },
      {
        name: `3. createApi`,
        import: { '@reduxjs/toolkit/query': '{ createApi }' },
      },
      {
        name: `3. createApi (react)`,
        import: { '@reduxjs/toolkit/query/react': '{ createApi }' },
      },
      {
        name: `3. fetchBaseQuery`,
        import: { '@reduxjs/toolkit/query': '{ fetchBaseQuery }' },
      },
      {
        name: `3. setupListeners`,
        import: { '@reduxjs/toolkit/query': '{ setupListeners }' },
      },
      {
        name: `3. ApiProvider`,
        import: { '@reduxjs/toolkit/query/react': '{ ApiProvider }' },
      },
    ].map((e) => ({
      ...e,
      name: e.name + ` (.modern.mjs)`,
      modifyWebpackConfig: withRtkPath('.modern.mjs'),
    }))
  )
