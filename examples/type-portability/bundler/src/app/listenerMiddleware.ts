import { createListenerMiddleware } from '@reduxjs/toolkit'

export const listenerMiddleware = createListenerMiddleware()

export const { clearListeners, middleware, startListening, stopListening } =
  listenerMiddleware

export const { withTypes } = startListening

export const { withTypes: _withTypes } = stopListening
