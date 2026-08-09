// `require()` of every RTK entry point on a Node version where `require(esm)`
// is enabled by default (22.12+ and 23.1+). Node adds the `module-sync`
// condition, so these resolve to the `modern.mjs` bundles even though the
// caller is CommonJS. This is what a plain `require('@reduxjs/toolkit')` does
// for a user on a current Node release.

const rtk = require('@reduxjs/toolkit')
const rtkReact = require('@reduxjs/toolkit/react')
const rtkQuery = require('@reduxjs/toolkit/query')
const rtkQueryReact = require('@reduxjs/toolkit/query/react')

const checks = require('./checks.cjs')

console.log('Testing `require()` with require(esm) enabled...')

checks.checkResolvedPaths('esm', require.resolve)
checks.checkBehavior({ rtk, rtkReact, rtkQuery, rtkQueryReact })

console.log('require(esm) test succeeded\n')
