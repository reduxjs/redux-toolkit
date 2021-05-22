const webpack = require('webpack')
let { join } = require('path')

const rtkEntryPoints = [
  'dist/redux-toolkit.cjs.production.min.js',
  'dist/redux-toolkit.esm.js',
  'dist/redux-toolkit.modern.js',
  'dist/redux-toolkit.modern.production.min.js',
]

const queryEntryPoints = [
  'dist/query/rtk-query.cjs.production.min.js',
  'dist/query/rtk-query.esm.js',
  'dist/query/rtk-query.modern.js',
  'dist/query/rtk-query.modern.production.min.js',
]

const reactEntryPoints = [
  'dist/query/react/rtk-query-react.cjs.production.min.js',
  'dist/query/react/rtk-query-react.esm.js',
  'dist/query/react/rtk-query-react.modern.js',
  'dist/query/react/rtk-query-react.modern.production.min.js',
]

function withRtkPath(path) {
  return (config) => {
    const rtkPath = path.replace(
      /(query\/rtk-query|query\/react\/rtk-query-react)/,
      'redux-toolkit'
    )
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /@reduxjs\/toolkit/,
        join(__dirname, rtkPath)
      )
    )
    return config
  }
}

module.exports = [
  ...rtkEntryPoints.flatMap((path) => [
    {
      name: `RTK main entry point (${path})`,
      path,
    },
    {
      name: `configureStore (${path})`,
      path,
      import: '{ configureStore }',
    },
    {
      name: `createSlice (${path})`,
      path,
      import: '{ createSlice }',
    },
    {
      name: `createEntityAdapter (${path})`,
      path,
      import: '{ createEntityAdapter }',
    },
  ]),
  ...queryEntryPoints.concat(reactEntryPoints).flatMap((path) => [
    {
      name: `RTK-Query entry point (including all imports from RTK & immer) (${path})`,
      path,
      modifyWebpackConfig: withRtkPath(path),
      ignore: ['react'],
    },
    {
      name: `RTK-Query entry point (without RTK, immer, react-redux) (${path})`,
      path,
      modifyWebpackConfig: withRtkPath(path),
      ignore: ['@reduxjs/toolkit', 'immer', 'react-redux', 'react'],
    },
    {
      name: `createApi (${path})`,
      path,
      import: '{ createApi }',
      modifyWebpackConfig: withRtkPath(path),
      ignore: ['react'],
    },
    {
      name: `setupListeners (${path})`,
      path,
      import: '{ setupListeners }',
      modifyWebpackConfig: withRtkPath(path),
      ignore: ['react'],
    },
    {
      name: `fetchBaseQuery (${path})`,
      path,
      import: '{ fetchBaseQuery }',
      modifyWebpackConfig: withRtkPath(path),
      ignore: ['react'],
    },
  ]),
].sort((a, b) => a.name.localeCompare(b.name) * 10)
