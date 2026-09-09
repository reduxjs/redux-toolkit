import type { Middleware } from "@reduxjs/toolkit"
import { getCount, selectCount } from "./counterSlice"

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
