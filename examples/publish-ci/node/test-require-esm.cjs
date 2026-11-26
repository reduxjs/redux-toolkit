// `require()` of every RTK entry point on a Node version where `require(esm)`
// is enabled by default (20.19+ and 22.12+). RTK only ships ES modules, so
// this is how a CommonJS caller loads it.

const rtk = require('@reduxjs/toolkit')
const rtkReact = require('@reduxjs/toolkit/react')
const rtkQuery = require('@reduxjs/toolkit/query')
const rtkQueryReact = require('@reduxjs/toolkit/query/react')

const checks = require('./checks.cjs')

console.log('Testing `require()` with require(esm) enabled...')

checks.checkResolvedPaths(require.resolve)
checks.checkBehavior({ rtk, rtkReact, rtkQuery, rtkQueryReact })

console.log('require(esm) test succeeded\n')
