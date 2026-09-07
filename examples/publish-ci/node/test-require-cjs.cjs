// `require()` of every RTK entry point with require(esm) turned off.
// Without `module-sync` in the condition list, resolution falls through to the
// `default` branch and loads the real CommonJS build. This is also how Node
// versions older than 22.12 resolve RTK.

const rtk = require('@reduxjs/toolkit')
const rtkReact = require('@reduxjs/toolkit/react')
const rtkQuery = require('@reduxjs/toolkit/query')
const rtkQueryReact = require('@reduxjs/toolkit/query/react')

const checks = require('./checks.cjs')

console.log('Testing `require()` with require(esm) disabled...')

checks.checkResolvedPaths('cjs', require.resolve)
checks.checkBehavior({ rtk, rtkReact, rtkQuery, rtkQueryReact })

console.log('CommonJS build test succeeded\n')
