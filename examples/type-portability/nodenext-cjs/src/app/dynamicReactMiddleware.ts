import ReduxToolkitReact = require('@reduxjs/toolkit/react')
import listenerMiddlewareModule = require('./listenerMiddleware.js')

namespace dynamicReactMiddlewareModule {
  import createDynamicMiddleware = ReduxToolkitReact.createDynamicMiddleware

  import listenerMiddleware = listenerMiddlewareModule.listenerMiddleware

  export const dynamicReactMiddleware = createDynamicMiddleware()

  export const {
    addMiddleware,
    createDispatchWithMiddlewareHook,
    createDispatchWithMiddlewareHookFactory,
    instanceId,
    middleware,
    withMiddleware,
  } = dynamicReactMiddleware

  export const { withTypes } = addMiddleware

  export const useDispatchWithMiddleware = createDispatchWithMiddlewareHook(
    listenerMiddleware.middleware,
  )
}

export = dynamicReactMiddlewareModule
