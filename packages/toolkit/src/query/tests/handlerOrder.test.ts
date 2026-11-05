import { configureStore } from '@reduxjs/toolkit'
import { fakeBaseQuery } from '@reduxjs/toolkit/query'
// The source `createApi`, so its middleware reads the same `handlerBuilders`
// array this test patches, also when tests run against the build artifact.
import { createApi } from '../core'
import { buildCacheCollectionHandler } from '../core/buildMiddleware/cacheCollection'
import { buildCacheLifecycleHandler } from '../core/buildMiddleware/cacheLifecycle'
import { buildDevCheckHandler } from '../core/buildMiddleware/devMiddleware'
import { handlerBuilders } from '../core/buildMiddleware/index'
import { buildInvalidationByTagsHandler } from '../core/buildMiddleware/invalidationByTags'
import { buildPollingHandler } from '../core/buildMiddleware/polling'
import { buildQueryLifecycleHandler } from '../core/buildMiddleware/queryLifecycle'
import { buildQueryRecordHandler } from '../core/buildMiddleware/queryRecord'

const documentedOrder = [
  buildQueryRecordHandler,
  buildDevCheckHandler,
  buildCacheCollectionHandler,
  buildInvalidationByTagsHandler,
  buildPollingHandler,
  buildCacheLifecycleHandler,
  buildQueryLifecycleHandler,
]

test('the handler list matches the documented order', () => {
  expect(handlerBuilders).toEqual(documentedOrder)
})

test('the middleware runs its handlers in list order', () => {
  const originalBuilders = [...handlerBuilders]
  const calls: number[] = []

  handlerBuilders.forEach((build, index) => {
    handlerBuilders[index] = (input) => {
      const handler = build(input)
      return (action, mwApi, stateBefore) => {
        calls.push(index)
        return handler(action, mwApi, stateBefore)
      }
    }
  })

  try {
    const api = createApi({
      baseQuery: fakeBaseQuery(),
      endpoints: () => ({}),
    })
    const store = configureStore({
      reducer: { [api.reducerPath]: api.reducer },
      middleware: (gDM) => gDM().concat(api.middleware),
    })

    calls.length = 0
    store.dispatch(api.util.invalidateTags([]))

    expect(calls).toEqual(documentedOrder.map((_, index) => index))
  } finally {
    handlerBuilders.splice(0, handlerBuilders.length, ...originalBuilders)
  }
})
