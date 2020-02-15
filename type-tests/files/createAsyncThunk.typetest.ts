import { createAsyncThunk, Dispatch, createReducer } from 'src'
import { ThunkDispatch } from 'redux-thunk'

function expectType<T>(t: T) {
  return t
}
function fn() {}

// basic usage
{
  const dispatch = fn as ThunkDispatch<any, any, any>

  const async = createAsyncThunk('test', (id: number) =>
    Promise.resolve(id * 2)
  )
  dispatch(async(3))

  const reducer = createReducer({}, builder =>
    builder
      .addCase(async.pending, (_, action) => {})
      .addCase(async.fulfilled, (_, action) => {
        expectType<number>(action.payload)
      })
      .addCase(async.rejected, (_, action) => {})
  )
}
