const fsPromises = require('fs/promises')

const esbuild = require('esbuild')

const createBuild = ({ format, env, minify = false }) => {
  return esbuild.build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    minify,
    format,
    sourcemap: 'external',
    define: {
      'process.env.NODE_ENV': JSON.stringify(env)
    },
    outfile: `dist/redux-toolkit.${format}.${env}${minify ? '.min' : ''}.js`
  })
}

Promise.all([
  createBuild({ format: 'esm', env: 'production', minify: true }),
  createBuild({ format: 'esm', env: 'development', minify: false }),
  createBuild({ format: 'cjs', env: 'production', minify: true }),
  createBuild({ format: 'cjs', env: 'development', minify: false }),
  createBuild({ format: 'iife', env: 'production', minify: true }),
  createBuild({ format: 'iife', env: 'development', minify: false })
]).then(
  () => {
    return fsPromises.writeFile(
      'dist/index.js',
      `
'use strict'

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./redux-toolkit.cjs.production.min.js')
} else {
  module.exports = require('./redux-toolkit.cjs.development.js')
}  
`
    )
  },
  () => process.exit(1)
)
