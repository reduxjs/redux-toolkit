import ReduxToolkit = require('@reduxjs/toolkit')

namespace listenerMiddlewareModule {
  import createListenerMiddleware = ReduxToolkit.createListenerMiddleware

  export const listenerMiddleware = createListenerMiddleware()

  export const { clearListeners, middleware, startListening, stopListening } =
    listenerMiddleware

  export const { withTypes } = startListening

  export const { withTypes: _withTypes } = stopListening
}

export = listenerMiddlewareModule
