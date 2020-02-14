import { createAsyncThunk } from './createAsyncThunk'
import { configureStore } from './configureStore'

describe('createAsyncThunk', () => {
  it('creates the action types', () => {
    const thunkActionCreator = createAsyncThunk('testType', async () => 42)

    expect(thunkActionCreator.fulfilled.type).toBe('testType/fulfilled')
    expect(thunkActionCreator.pending.type).toBe('testType/pending')
    expect(thunkActionCreator.finished.type).toBe('testType/finished')
    expect(thunkActionCreator.rejected.type).toBe('testType/rejected')
  })

  it('works without passing arguments to the payload creator', async () => {
    const thunkActionCreator = createAsyncThunk('testType', async () => 42)

    let timesReducerCalled = 0

    const reducer = () => {
      timesReducerCalled++
    }

    const store = configureStore({
      reducer
    })

    // reset from however many times the store called it
    timesReducerCalled = 0

    await store.dispatch(thunkActionCreator())

    expect(timesReducerCalled).toBe(3)
  })

  it('accepts arguments and dispatches the actions on resolve', async () => {
    const dispatch = jest.fn()

    let passedArgs: any

    const result = 42
    const args = 123
    let generatedRequestId = ''

    const thunkActionCreator = createAsyncThunk(
      'testType',
      async (args: number, { requestId }) => {
        passedArgs = args
        generatedRequestId = requestId
        return result
      }
    )

    const thunkFunction = thunkActionCreator(args)

    await thunkFunction(dispatch, undefined, undefined)

    expect(passedArgs).toBe(args)

    expect(dispatch).toHaveBeenNthCalledWith(
      1,
      thunkActionCreator.pending(generatedRequestId, args)
    )

    expect(dispatch).toHaveBeenNthCalledWith(
      2,
      thunkActionCreator.fulfilled(result, generatedRequestId, args)
    )

    expect(dispatch).toHaveBeenNthCalledWith(
      3,
      thunkActionCreator.finished(generatedRequestId, args)
    )
  })

  it('accepts arguments and dispatches the actions on reject', async () => {
    const dispatch = jest.fn()

    const args = 123
    let generatedRequestId = ''

    const error = new Error('Panic!')

    const thunkActionCreator = createAsyncThunk(
      'testType',
      async (args: number, { requestId }) => {
        generatedRequestId = requestId
        throw error
      }
    )

    const thunkFunction = thunkActionCreator(args)

    await thunkFunction(dispatch, undefined, undefined)

    expect(dispatch).toHaveBeenNthCalledWith(
      1,
      thunkActionCreator.pending(generatedRequestId, args)
    )

    expect(dispatch).toHaveBeenNthCalledWith(
      2,
      thunkActionCreator.rejected(error, generatedRequestId, args)
    )

    expect(dispatch).toHaveBeenNthCalledWith(
      3,
      thunkActionCreator.finished(generatedRequestId, args)
    )
  })
})
