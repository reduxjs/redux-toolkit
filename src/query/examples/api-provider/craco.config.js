const path = require('path')
const resolveFrom = require('resolve-from')

module.exports = {
  webpack: {
    resolve: {
      alias: {
        '@reduxjs/toolkit/query': path.resolve(__dirname, '../../'),
        '@reduxjs/toolkit': path.resolve(__dirname, '../../../'),
        react: resolveFrom(
          path.resolve(__dirname, '../../../node_modules'),
          'react'
        ),
        'react-dom$': resolveFrom(
          path.resolve(__dirname, '../../../node_modules'),
          'react-dom'
        ),
        'eslint-plugin-prettier': resolveFrom(
          'node_modules',
          'eslint-plugin-prettier'
        ),
        'babel-jest': resolveFrom(path.resolve('node_modules'), 'babel-jest'),
      },
    },
  },
}
