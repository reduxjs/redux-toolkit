import { createAsyncThunk, Dispatch, createReducer, AnyAction } from 'src'
import { ThunkDispatch } from 'redux-thunk'
import { promises } from 'fs'

function expectType<T>(t: T) {
  return t
}
function fn() {}

// basic usage
;(async function() {
  const dispatch = fn as ThunkDispatch<{}, any, AnyAction>

  const async = createAsyncThunk('test', (id: number) =>
    Promise.resolve(id * 2)
  )

  const reducer = createReducer({}, builder =>
    builder
      .addCase(async.pending, (_, action) => {
        expectType<ReturnType<typeof async['pending']>>(action)
      })
      .addCase(async.fulfilled, (_, action) => {
        expectType<ReturnType<typeof async['fulfilled']>>(action)
        expectType<number>(action.payload)
      })
      .addCase(async.rejected, (_, action) => {
        expectType<ReturnType<typeof async['rejected']>>(action)
        expectType<Error>(action.error)
      })
  )

  const promise = dispatch(async(3))
  const result = await promise

  if (async.fulfilled.match(result)) {
    expectType<ReturnType<typeof async['fulfilled']>>(result)
    // typings:expect-error
    expectType<ReturnType<typeof async['rejected']>>(result)
  } else {
    expectType<ReturnType<typeof async['rejected']>>(result)
    // typings:expect-error
    expectType<ReturnType<typeof async['fulfilled']>>(result)
  }

  promise
    .then(async.unwrapResult)
    .then(result => {
      expectType<number>(result)
      // typings:expect-error
      expectType<Error>(result)
    })
    .catch(error => {
      // catch is always any-typed, nothing we can do here
    })
})()
