import { createAsyncThunk } from './createAsyncThunk'

describe('createAsyncThunk', () => {
  it('creates the action types', () => {
    const thunkActionCreator = createAsyncThunk('testType', async () => 42)

    expect(thunkActionCreator.fulfilled.type).toBe('testType/fulfilled')
    expect(thunkActionCreator.pending.type).toBe('testType/pending')
    expect(thunkActionCreator.finished.type).toBe('testType/finished')
    expect(thunkActionCreator.rejected.type).toBe('testType/rejected')
  })

  it('accepts arguments and dispatches the actions on resolve', async () => {
    const dispatch = jest.fn()

    let passedArgs: any

    const result = 42
    const args = 123

    const thunkActionCreator = createAsyncThunk(
      'testType',
      async ({ args }) => {
        passedArgs = args
        return result
      }
    )

    const thunkFunction = thunkActionCreator(args)

    await thunkFunction(dispatch, undefined, undefined)

    expect(passedArgs).toBe(args)

    expect(dispatch).toHaveBeenNthCalledWith(
      1,
      thunkActionCreator.pending(args)
    )

    expect(dispatch).toHaveBeenNthCalledWith(
      2,
      thunkActionCreator.fulfilled(result, args)
    )

    expect(dispatch).toHaveBeenNthCalledWith(
      3,
      thunkActionCreator.finished(args)
    )
  })

  it('accepts arguments and dispatches the actions on reject', async () => {
    const dispatch = jest.fn()

    let passedArgs: any
    const args = 123

    const error = new Error('Panic!')

    const thunkActionCreator = createAsyncThunk('testType', async () => {
      throw error
    })

    const thunkFunction = thunkActionCreator(args)

    await thunkFunction(dispatch, undefined, undefined)

    expect(dispatch).toHaveBeenNthCalledWith(
      1,
      thunkActionCreator.pending(args)
    )

    expect(dispatch).toHaveBeenNthCalledWith(
      2,
      thunkActionCreator.rejected(error, args)
    )

    expect(dispatch).toHaveBeenNthCalledWith(
      3,
      thunkActionCreator.finished(args)
    )
  })
})
