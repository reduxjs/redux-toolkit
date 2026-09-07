// `import` of every RTK entry point from an ES module.
// Expected to load the `modern.mjs` bundles via the `import` condition.

import * as rtk from '@reduxjs/toolkit'
import * as rtkReact from '@reduxjs/toolkit/react'
import * as rtkQuery from '@reduxjs/toolkit/query'
import * as rtkQueryReact from '@reduxjs/toolkit/query/react'

import checks from './checks.cjs'

console.log('Testing `import` from an ES module...')

checks.checkResolvedPaths('esm', (moduleName) =>
  import.meta.resolve(moduleName),
)
checks.checkBehavior({ rtk, rtkReact, rtkQuery, rtkQueryReact })

console.log('ESM import test succeeded\n')
