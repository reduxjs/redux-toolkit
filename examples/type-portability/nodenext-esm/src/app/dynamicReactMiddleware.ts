import { createDynamicMiddleware } from '@reduxjs/toolkit/react'
import { listenerMiddleware } from './listenerMiddleware.js'

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
