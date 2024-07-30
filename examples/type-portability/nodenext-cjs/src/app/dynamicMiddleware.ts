import ReduxToolkit = require('@reduxjs/toolkit')

namespace dynamicMiddlewareModule {
  import createDynamicMiddleware = ReduxToolkit.createDynamicMiddleware

  export const dynamicMiddleware = createDynamicMiddleware()

  export const { addMiddleware, instanceId, middleware, withMiddleware } =
    dynamicMiddleware

  export const { withTypes, match, type } = withMiddleware

  export const { withTypes: _withTypes } = addMiddleware
}

export = dynamicMiddlewareModule
