import { createDynamicMiddleware } from "@reduxjs/toolkit"
import { AppDispatch, RootState } from "./store"

const dynamicInstance = createDynamicMiddleware()

export const { middleware: dynamicMiddleware } = dynamicInstance

export const addAppMiddleware = dynamicInstance.addMiddleware.withTypes<{
  state: RootState
  dispatch: AppDispatch
}>()

export const withAppMiddleware = dynamicInstance.withMiddleware.withTypes<{
  state: RootState
  dispatch: AppDispatch
}>()
