import type { UnknownAction } from '@reduxjs/toolkit'
import { configureStore, createAsyncThunkWithProgress } from '@reduxjs/toolkit'

describe('createAsyncThunkWithProgress', () => {
  it('creates the action types, including `progress`', () => {
    const thunkActionCreator = createAsyncThunkWithProgress(
      'testType',
      async () => 42,
    )

    expect(thunkActionCreator.fulfilled.type).toBe('testType/fulfilled')
    expect(thunkActionCreator.pending.type).toBe('testType/pending')
    expect(thunkActionCreator.rejected.type).toBe('testType/rejected')
    expect(thunkActionCreator.progress.type).toBe('testType/progress')
  })

  it('calls onProgress with whatever the payload creator passes it', async () => {
    type ProgressEvent = { loaded: number; total: number }

    const thunkActionCreator = createAsyncThunkWithProgress<
      number,
      void,
      {},
      ProgressEvent
    >('testType', async (_arg, _thunkAPI, onProgress) => {
      onProgress({ loaded: 50, total: 100 })
      onProgress({ loaded: 100, total: 100 })
      return 42
    })

    const store = configureStore({
      reducer: (state: UnknownAction[] = [], action) => [...state, action],
    })

    await store.dispatch(thunkActionCreator())

    const progressActions = store
      .getState()
      .filter(thunkActionCreator.progress.match)

    expect(progressActions).toHaveLength(2)
    expect(progressActions[0].payload).toEqual({ loaded: 50, total: 100 })
    expect(progressActions[1].payload).toEqual({ loaded: 100, total: 100 })
  })

  it('dispatches progress actions with the request metadata attached', async () => {
    const thunkActionCreator = createAsyncThunkWithProgress<
      number,
      string,
      {},
      number
    >('testType', async (arg, thunkAPI, onProgress) => {
      onProgress(1)
      return arg.length
    })

    const store = configureStore({
      reducer: (state: UnknownAction[] = [], action) => [...state, action],
    })

    const result = await store.dispatch(thunkActionCreator('hello'))

    const [progressAction] = store
      .getState()
      .filter(thunkActionCreator.progress.match)

    expect(progressAction.payload).toBe(1)
    expect(progressAction.meta).toMatchObject({
      arg: 'hello',
      requestId: result.meta.requestId,
      requestStatus: 'pending',
    })
  })

  it('still dispatches pending/fulfilled/rejected as usual', async () => {
    const thunkActionCreator = createAsyncThunkWithProgress<number>(
      'testType',
      async (_arg, _thunkAPI, onProgress) => {
        onProgress(undefined)
        return 42
      },
    )

    const store = configureStore({
      reducer: (state: UnknownAction[] = [], action) => [...state, action],
    })

    await store.dispatch(thunkActionCreator())

    const types = store.getState().map((action) => action.type)

    expect(types.slice(1)).toEqual([
      'testType/pending',
      'testType/progress',
      'testType/fulfilled',
    ])
  })
})
