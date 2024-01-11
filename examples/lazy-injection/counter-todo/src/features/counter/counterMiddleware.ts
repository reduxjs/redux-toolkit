import { Middleware, createAction } from "@reduxjs/toolkit"
import { selectCount } from "./counterSlice"

export const getCount = createAction("counter/getCount")

export const counterMiddleware: Middleware<{
  (action: ReturnType<typeof getCount>): number
}> = api => {
  console.log("counter middleware initialised!")
  return next => action => {
    const result = next(action)
    if (getCount.match(action)) {
      return selectCount(api.getState())
    }
    return result
  }
}
