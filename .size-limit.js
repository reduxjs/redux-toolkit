const webpack = require('webpack')
let { join } = require('path')
const { getConstantValue } = require('typescript')

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
    if (path.startsWith('dist/query/rtk-query')) {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /@reduxjs\/toolkit/,
          join(
            __dirname,
            path.replace('dist/query/rtk-query', 'dist/redux-toolkit')
          )
        )
      )
    }
    if (path.startsWith('dist/query/react/rtk-query-react')) {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /@reduxjs\/toolkit\/query/,
          join(
            __dirname,
            path.replace(
              'dist/query/react/rtk-query-react',
              'dist/query/rtk-query'
            )
          )
        ),
        new webpack.NormalModuleReplacementPlugin(
          /@reduxjs\/toolkit/,
          join(
            __dirname,
            path.replace(
              'dist/query/react/rtk-query-react',
              'dist/redux-toolkit'
            )
          )
        )
      )
    }
    return config
  }
}

const ignoreReact = ['react']
const ignoreAll = [
  '@reduxjs/toolkit',
  '@reduxjs/toolkit',
  'immer',
  'redux',
  'reselect',
  'redux-thunk',
  'react-redux',
  'react',
]

module.exports = [
  ...[...rtkEntryPoints, ...queryEntryPoints, ...reactEntryPoints].flatMap(
    (path) => [
      {
        name: `1. entry point: ${path} (with all dependencies except react)`,
        path,
        modifyWebpackConfig: withRtkPath(path),
        ignore: ignoreReact,
      },
      {
        name: `2. entry point: ${path} (without dependencies)`,
        path,
        modifyWebpackConfig: withRtkPath(path),
        ignore: ignoreAll,
      },
    ]
  ),
  ...rtkEntryPoints.flatMap((path) => [
    {
      name: `3. createSlice (${path})`,
      path,
      import: '{ createSlice }',
    },
    {
      name: `3. createEntityAdapter (${path})`,
      path,
      import: '{ createEntityAdapter }',
    },
    {
      name: `3. configureStore (${path})`,
      path,
      import: '{ configureStore }',
    },
  ]),
  ...[...queryEntryPoints, ...reactEntryPoints].flatMap((path) => [
    {
      name: `3. createApi (${path})`,
      path,
      import: '{ createApi }',
      modifyWebpackConfig: withRtkPath(path),
      ignore: ['react'],
    },
    {
      name: `3. setupListeners (${path})`,
      path,
      import: '{ setupListeners }',
      modifyWebpackConfig: withRtkPath(path),
      ignore: ['react'],
    },
    {
      name: `3. fetchBaseQuery (${path})`,
      path,
      import: '{ fetchBaseQuery }',
      modifyWebpackConfig: withRtkPath(path),
      ignore: ['react'],
    },
  ]),
].sort(byName)

function score(e) {
  return (!e.import ? -100 : 0) + (e.ignore === ignoreReact ? -10 : 0)
}

function byName(a, b) {
  return (
    b.path.localeCompare(a.path) +
    a.name.substring(0, 12).localeCompare(b.name.substring(0, 12)) * 10
  )
}

console.log(module.exports.map((m) => m.name))
