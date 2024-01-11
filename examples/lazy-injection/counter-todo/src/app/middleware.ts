import { createDynamicMiddleware } from "@reduxjs/toolkit/react"
import { AppDispatch, RootState } from "./store"

const dynamicInstance = createDynamicMiddleware()

export const { middleware: dynamicMiddleware } = dynamicInstance

type Config = {
  state: RootState
  dispatch: AppDispatch
}

export const addAppMiddleware =
  dynamicInstance.addMiddleware.withTypes<Config>()

export const withAppMiddleware =
  dynamicInstance.withMiddleware.withTypes<Config>()

export const createAppDispatchWithMiddlewareHook =
  dynamicInstance.createDispatchWithMiddlewareHook.withTypes<Config>()
