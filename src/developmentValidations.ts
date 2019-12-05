import { createAction } from './createAction'

interface ValidationMeta {
  seenSlices: symbol[]
  seenSliceNames: string[]
  seenSliceMiddlewares: symbol[]
}

const validate = createAction(
  '__REDUX_TOOLKIT_DEVELOPMENT_MODE_VALIDATION__',
  () => ({
    payload: undefined,
    meta: {
      seenSlices: [],
      seenSliceNames: [],
      seenSliceMiddlewares: []
    } as ValidationMeta
  })
)

export function devModeWrapStore<S extends import('redux').Store>(store: S): S {
  if (process.env.NODE_ENV !== 'production') {
    store.dispatch(validate())
  }
  return store
}

export function devModeWrapSlice<S extends import('./createSlice').Slice>(
  slice: S
): S {
  if (process.env.NODE_ENV !== 'production') {
    const sliceSymbol = Symbol(slice.name)
    return {
      ...slice,
      reducer: wrapReducer(slice.reducer),
      middleware: slice.middleware
        ? wrapMiddleware(slice.middleware!)
        : undefined
    }

    function wrapReducer(
      reducer: import('redux').Reducer
    ): import('redux').Reducer {
      return function(state: any, action: any) {
        if (validate.match(action)) {
          if (action.meta.seenSlices.includes(sliceSymbol)) {
            console.warn(
              `You use the same reducer (for slice "${slice.name}") twice - this is most likely a bug.`
            )
          }
          if (action.meta.seenSliceNames.includes(slice.name)) {
            console.warn(
              `You use two slices with the same name "${slice.name}" - this is most likely a bug.`
            )
          }
          if (
            slice.middleware &&
            !action.meta.seenSliceMiddlewares.includes(sliceSymbol)
          ) {
            console.warn(
              `Slice ${slice.name} has a middleware, but is is not being used. This is most likely a bug.`
            )
          }
          action.meta.seenSlices.push(sliceSymbol)
          action.meta.seenSliceNames.push(slice.name)
        }
        return reducer(state, action)
      }
    }
    function wrapMiddleware(
      middleware: import('redux').Middleware
    ): import('redux').Middleware {
      return api => {
        const boundWithApi = middleware(api)
        return next => {
          const boundWithNext = boundWithApi(next)
          return action => {
            if (validate.match(action)) {
              action.meta.seenSliceMiddlewares.push(sliceSymbol)
            }
            return boundWithNext(action)
          }
        }
      }
    }
  }
  return slice
}
