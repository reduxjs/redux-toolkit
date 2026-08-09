const assert = require('node:assert/strict')
const path = require('node:path')

// The four entry points RTK publishes, and the file each one is expected to
// resolve to under a given resolution flavor.
const expectedPaths = {
  esm: {
    '@reduxjs/toolkit': 'dist/redux-toolkit.modern.mjs',
    '@reduxjs/toolkit/react': 'dist/react/redux-toolkit-react.modern.mjs',
    '@reduxjs/toolkit/query': 'dist/query/rtk-query.modern.mjs',
    '@reduxjs/toolkit/query/react':
      'dist/query/react/rtk-query-react.modern.mjs',
  },
  cjs: {
    '@reduxjs/toolkit': 'dist/cjs/index.js',
    '@reduxjs/toolkit/react': 'dist/react/cjs/index.js',
    '@reduxjs/toolkit/query': 'dist/query/cjs/index.js',
    '@reduxjs/toolkit/query/react': 'dist/query/react/cjs/index.js',
  },
}

function toPosix(filePath) {
  return filePath.split(path.sep).join(path.posix.sep)
}

// `resolve` is `require.resolve` (returns a path) or a wrapper around
// `import.meta.resolve` (returns a file:// URL). `endsWith` works on both.
function checkResolvedPaths(flavor, resolve) {
  const expected = expectedPaths[flavor]
  for (const [moduleName, expectedFilename] of Object.entries(expected)) {
    const resolved = toPosix(resolve(moduleName))
    console.log(`  ${moduleName} -> ${resolved}`)
    assert.ok(
      resolved.endsWith(expectedFilename),
      `${moduleName} resolved to '${resolved}', expected it to end with '${expectedFilename}'`,
    )
  }
}

function checkCore(rtk) {
  const counterSlice = rtk.createSlice({
    name: 'counter',
    initialState: { value: 0 },
    reducers: {
      incremented(state) {
        state.value += 1
      },
    },
  })

  assert.equal(counterSlice.actions.incremented.type, 'counter/incremented')

  const store = rtk.configureStore({
    reducer: { counter: counterSlice.reducer },
  })
  store.dispatch(counterSlice.actions.incremented())

  assert.deepEqual(store.getState(), { counter: { value: 1 } })
}

function checkReact(rtkReact) {
  // Re-exported from the core entry point.
  assert.equal(typeof rtkReact.createSlice, 'function')

  const instance = rtkReact.createDynamicMiddleware()
  assert.equal(typeof instance.middleware, 'function')

  // Only the React build adds this. Its presence proves we did not fall back
  // to the core `createDynamicMiddleware`.
  assert.equal(typeof instance.createDispatchWithMiddlewareHook, 'function')
}

function createTestApi(rtkQueryModule, reducerPath) {
  return rtkQueryModule.createApi({
    reducerPath,
    baseQuery: rtkQueryModule.fetchBaseQuery({
      baseUrl: 'https://example.com',
    }),
    endpoints: (build) => ({
      getThing: build.query({ query: (id) => `/things/${id}` }),
    }),
  })
}

function checkQuery(rtkQuery) {
  const api = createTestApi(rtkQuery, 'plainApi')

  assert.equal(api.reducerPath, 'plainApi')
  assert.equal(typeof api.reducer, 'function')
  assert.equal(typeof api.middleware, 'function')
  assert.equal(typeof api.endpoints.getThing.initiate, 'function')

  // The core entry point must not generate hooks.
  assert.equal(api.useGetThingQuery, undefined)
}

function checkQueryReact(rtkQueryReact) {
  const api = createTestApi(rtkQueryReact, 'reactApi')

  assert.equal(api.reducerPath, 'reactApi')
  assert.equal(typeof api.useGetThingQuery, 'function')
  assert.equal(typeof api.usePrefetch, 'function')
  assert.equal(typeof api.endpoints.getThing.useQuery, 'function')
}

function checkBehavior(modules) {
  checkCore(modules.rtk)
  checkReact(modules.rtkReact)
  checkQuery(modules.rtkQuery)
  checkQueryReact(modules.rtkQueryReact)
  console.log('  all four entry points behaved correctly')
}

module.exports = { checkResolvedPaths, checkBehavior }
