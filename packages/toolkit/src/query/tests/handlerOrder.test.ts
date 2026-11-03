import { buildCacheCollectionHandler } from '../core/buildMiddleware/cacheCollection'
import { buildCacheLifecycleHandler } from '../core/buildMiddleware/cacheLifecycle'
import { buildDevCheckHandler } from '../core/buildMiddleware/devMiddleware'
import { handlerBuilders } from '../core/buildMiddleware/index'
import { buildInvalidationByTagsHandler } from '../core/buildMiddleware/invalidationByTags'
import { buildPollingHandler } from '../core/buildMiddleware/polling'
import { buildQueryLifecycleHandler } from '../core/buildMiddleware/queryLifecycle'

test('middleware handlers run in the documented order', () => {
  expect(handlerBuilders).toEqual([
    buildDevCheckHandler,
    buildCacheCollectionHandler,
    buildInvalidationByTagsHandler,
    buildPollingHandler,
    buildCacheLifecycleHandler,
    buildQueryLifecycleHandler,
  ])
})
