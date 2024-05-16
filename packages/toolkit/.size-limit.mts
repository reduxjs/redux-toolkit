const webpack = require('webpack')
let { join } = require('path')

const esmSuffixes = ['modern.mjs', 'browser.mjs' /*, 'legacy-esm.js'*/]
const cjsSuffixes = [
  /*'development.cjs',*/
  /*'production.min.cjs'*/
]

function withRtkPath(suffix, cjs = false) {
  /**
   * @param {string} name
   */
  function alias(name) {
    return `${cjs ? 'cjs/' : ''}${name}.${suffix}`
  }
  /**
   * @param {webpack.Configuration} config
   */
  return (config) => {
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /@reduxjs\/toolkit\/query\/react/,
        join(__dirname, 'dist/query/react/rtk-query-react.modern.mjs'),
      ),
      new webpack.NormalModuleReplacementPlugin(
        /@reduxjs\/toolkit\/query/,
        join(__dirname, 'dist/query/rtk-query.modern.mjs'),
      ),
      new webpack.NormalModuleReplacementPlugin(
        /@reduxjs\/toolkit\/react/,
        join(__dirname, 'dist/react/redux-toolkit-react.modern.mjs'),
      ),
      new webpack.NormalModuleReplacementPlugin(
        /@reduxjs\/toolkit/,
        join(__dirname, 'dist/redux-toolkit.modern.mjs'),
      ),
      new webpack.NormalModuleReplacementPlugin(
        /rtk-query-react.modern.mjs/,
        (r) => {
          const old = r.request
          r.request = r.request.replace(
            /rtk-query-react.modern.mjs$/,
            alias('rtk-query-react'),
          )
          //console.log(old, '=>', r.request)
        },
      ),
      new webpack.NormalModuleReplacementPlugin(/rtk-query.modern.mjs/, (r) => {
        const old = r.request
        r.request = r.request.replace(
          /rtk-query.modern.mjs$/,
          alias('rtk-query'),
        )
        //console.log(old, '=>', r.request)
      }),
      new webpack.NormalModuleReplacementPlugin(
        /redux-toolkit-react.modern.mjs$/,
        (r) => {
          const old = r.request
          r.request = r.request.replace(
            /redux-toolkit-react.modern.mjs$/,
            alias('redux-toolkit-react'),
          )
          //console.log(old, '=>', r.request)
        },
      ),
      new webpack.NormalModuleReplacementPlugin(
        /redux-toolkit.modern.mjs$/,
        (r) => {
          const old = r.request
          r.request = r.request.replace(
            /redux-toolkit.modern.mjs$/,
            alias('redux-toolkit'),
          )
          //console.log(old, '=>', r.request)
        },
      ),
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
    })),
  )
  .concat(
    entryPoints.flatMap((e) =>
      cjsSuffixes.map((suffix) => ({
        ...e,
        name: e.name + ` (cjs, ${suffix})`,
        modifyWebpackConfig: withRtkPath(suffix, true),
      })),
    ),
  )
  .concat(
    [
      {
        name: `3. createSlice`,
        import: { '@reduxjs/toolkit': '{ createSlice }' },
      },
      {
        name: `3. createAsyncThunk`,
        import: { '@reduxjs/toolkit': '{ createAsyncThunk }' },
      },
      {
        name: `3. buildCreateSlice and asyncThunkCreator`,
        import: {
          '@reduxjs/toolkit': '{ buildCreateSlice, asyncThunkCreator }',
        },
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
        name: `3. combineSlices`,
        import: { '@reduxjs/toolkit': '{ combineSlices }' },
      },
      {
        name: `3. createDynamicMiddleware`,
        import: { '@reduxjs/toolkit': '{ createDynamicMiddleware }' },
      },
      {
        name: `3. createDynamicMiddleware (react)`,
        import: { '@reduxjs/toolkit/react': '{ createDynamicMiddleware }' },
      },
      {
        name: `3. createListenerMiddleware`,
        import: { '@reduxjs/toolkit': '{ createListenerMiddleware }' },
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
    ].map((e) => ({
      ...e,
      name: e.name + ` (.modern.mjs)`,
      modifyWebpackConfig: withRtkPath('modern.mjs'),
    })),
  )
