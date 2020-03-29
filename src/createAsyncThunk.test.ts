import {
  createAsyncThunk,
  miniSerializeError,
  unwrapResult
} from './createAsyncThunk'
import { configureStore } from './configureStore'
import { AnyAction } from 'redux'

import {
  mockConsole,
  createConsole,
  getLog
} from 'console-testing-library/pure'

declare global {
  interface Window {
    AbortController: AbortController
  }
}

describe('createAsyncThunk', () => {
  it('creates the action types', () => {
    const thunkActionCreator = createAsyncThunk('testType', async () => 42)

    expect(thunkActionCreator.fulfilled.type).toBe('testType/fulfilled')
    expect(thunkActionCreator.pending.type).toBe('testType/pending')
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

    expect(timesReducerCalled).toBe(2)
  })

  it('accepts arguments and dispatches the actions on resolve', async () => {
    const dispatch = jest.fn()

    let passedArg: any

    const result = 42
    const args = 123
    let generatedRequestId = ''

    const thunkActionCreator = createAsyncThunk(
      'testType',
      async (arg: number, { requestId }) => {
        passedArg = arg
        generatedRequestId = requestId
        return result
      }
    )

    const thunkFunction = thunkActionCreator(args)

    await thunkFunction(dispatch, () => {}, undefined)

    expect(passedArg).toBe(args)

    expect(dispatch).toHaveBeenNthCalledWith(
      1,
      thunkActionCreator.pending(generatedRequestId, args)
    )

    expect(dispatch).toHaveBeenNthCalledWith(
      2,
      thunkActionCreator.fulfilled(result, generatedRequestId, args)
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

    try {
      await thunkFunction(dispatch, () => {}, undefined)
    } catch (e) {}

    expect(dispatch).toHaveBeenNthCalledWith(
      1,
      thunkActionCreator.pending(generatedRequestId, args)
    )

    expect(dispatch).toHaveBeenCalledTimes(2)

    // Have to check the bits of the action separately since the error was processed
    const errorAction = dispatch.mock.calls[1][0]
    expect(errorAction.error).toEqual(miniSerializeError(error))
    expect(errorAction.meta.requestId).toBe(generatedRequestId)
    expect(errorAction.meta.arg).toBe(args)
  })

  it('dispatches an empty error when throwing a random object without serializedError properties', async () => {
    const dispatch = jest.fn()

    const args = 123
    let generatedRequestId = ''

    const errorObject = { wny: 'dothis' }

    const thunkActionCreator = createAsyncThunk(
      'testType',
      async (args: number, { requestId }) => {
        generatedRequestId = requestId
        throw errorObject
      }
    )

    const thunkFunction = thunkActionCreator(args)

    try {
      await thunkFunction(dispatch, () => {}, undefined)
    } catch (e) {}

    expect(dispatch).toHaveBeenNthCalledWith(
      1,
      thunkActionCreator.pending(generatedRequestId, args)
    )

    expect(dispatch).toHaveBeenCalledTimes(2)

    const errorAction = dispatch.mock.calls[1][0]
    expect(errorAction.error).toEqual({})
    expect(errorAction.meta.requestId).toBe(generatedRequestId)
    expect(errorAction.meta.arg).toBe(args)
  })

  it('dispatches an action with a formatted error when throwing an object with known error keys', async () => {
    const dispatch = jest.fn()

    const args = 123
    let generatedRequestId = ''

    const errorObject = {
      name: 'Custom thrown error',
      message: 'This is not necessary',
      code: '400'
    }

    const thunkActionCreator = createAsyncThunk(
      'testType',
      async (args: number, { requestId }) => {
        generatedRequestId = requestId
        throw errorObject
      }
    )

    const thunkFunction = thunkActionCreator(args)

    try {
      await thunkFunction(dispatch, () => {}, undefined)
    } catch (e) {}

    expect(dispatch).toHaveBeenNthCalledWith(
      1,
      thunkActionCreator.pending(generatedRequestId, args)
    )

    expect(dispatch).toHaveBeenCalledTimes(2)

    // Have to check the bits of the action separately since the error was processed
    const errorAction = dispatch.mock.calls[1][0]
    expect(errorAction.error).toEqual(miniSerializeError(errorObject))
    expect(Object.keys(errorAction.error)).not.toContain('stack')
    expect(errorAction.meta.requestId).toBe(generatedRequestId)
    expect(errorAction.meta.arg).toBe(args)
  })

  it('dispatches a rejected action with a customized payload when a user returns rejectWithValue()', async () => {
    const dispatch = jest.fn()

    const args = 123
    let generatedRequestId = ''

    const errorPayload = {
      errorMessage:
        'I am a fake server-provided 400 payload with validation details',
      errors: [
        { field_one: 'Must be a string' },
        { field_two: 'Must be a number' }
      ]
    }

    const thunkActionCreator = createAsyncThunk(
      'testType',
      async (args: number, { requestId, rejectWithValue }) => {
        generatedRequestId = requestId

        return rejectWithValue(errorPayload)
      }
    )

    const thunkFunction = thunkActionCreator(args)

    try {
      await thunkFunction(dispatch, () => {}, undefined)
    } catch (e) {}

    expect(dispatch).toHaveBeenNthCalledWith(
      1,
      thunkActionCreator.pending(generatedRequestId, args)
    )

    expect(dispatch).toHaveBeenCalledTimes(2)

    // Have to check the bits of the action separately since the error was processed
    const errorAction = dispatch.mock.calls[1][0]

    expect(errorAction.error.message).toEqual('Rejected')
    expect(errorAction.payload).toBe(errorPayload)
    expect(errorAction.meta.arg).toBe(args)
  })

  it('dispatches a rejected action with a miniSerializeError when rejectWithValue conditions are not satisfied', async () => {
    const dispatch = jest.fn()

    const args = 123
    let generatedRequestId = ''

    const error = new Error('Panic!')

    const errorPayload = {
      errorMessage:
        'I am a fake server-provided 400 payload with validation details',
      errors: [
        { field_one: 'Must be a string' },
        { field_two: 'Must be a number' }
      ]
    }

    const thunkActionCreator = createAsyncThunk(
      'testType',
      async (args: number, { requestId, rejectWithValue }) => {
        generatedRequestId = requestId

        try {
          throw error
        } catch (err) {
          if (!err.response) {
            throw err
          }
          return rejectWithValue(errorPayload)
        }
      }
    )

    const thunkFunction = thunkActionCreator(args)

    try {
      await thunkFunction(dispatch, () => {}, undefined)
    } catch (e) {}

    expect(dispatch).toHaveBeenNthCalledWith(
      1,
      thunkActionCreator.pending(generatedRequestId, args)
    )

    expect(dispatch).toHaveBeenCalledTimes(2)

    // Have to check the bits of the action separately since the error was processed
    const errorAction = dispatch.mock.calls[1][0]
    expect(errorAction.error).toEqual(miniSerializeError(error))
    expect(errorAction.payload).toEqual(undefined)
    expect(errorAction.meta.requestId).toBe(generatedRequestId)
    expect(errorAction.meta.arg).toBe(args)
  })
})

describe('createAsyncThunk with abortController', () => {
  const asyncThunk = createAsyncThunk('test', function abortablePayloadCreator(
    _: any,
    { signal }
  ) {
    return new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(
          new DOMException(
            'This should never be reached as it should already be handled.',
            'AbortError'
          )
        )
      }
      signal.addEventListener('abort', () => {
        reject(new DOMException('Was aborted while running', 'AbortError'))
      })
      setTimeout(resolve, 100)
    })
  })

  let store = configureStore({
    reducer(store: AnyAction[] = []) {
      return store
    }
  })

  beforeEach(() => {
    store = configureStore({
      reducer(store: AnyAction[] = [], action) {
        return [...store, action]
      }
    })
  })

  test('normal usage', async () => {
    await store.dispatch(asyncThunk({}))
    expect(store.getState()).toEqual([
      expect.any(Object),
      expect.objectContaining({ type: 'test/pending' }),
      expect.objectContaining({ type: 'test/fulfilled' })
    ])
  })

  test('abort after dispatch', async () => {
    const promise = store.dispatch(asyncThunk({}))
    promise.abort('AbortReason')
    const result = await promise
    const expectedAbortedAction = {
      type: 'test/rejected',
      error: {
        message: 'AbortReason',
        name: 'AbortError'
      },
      meta: { aborted: true }
    }
    // abortedAction with reason is dispatched after test/pending is dispatched
    expect(store.getState()).toMatchObject([
      {},
      { type: 'test/pending' },
      expectedAbortedAction
    ])

    // same abortedAction is returned, but with the AbortError from the abortablePayloadCreator
    expect(result).toMatchObject(expectedAbortedAction)

    // calling unwrapResult on the returned object re-throws the error from the abortablePayloadCreator
    expect(() => unwrapResult(result)).toThrowError(
      expect.objectContaining(expectedAbortedAction.error)
    )
  })

  test('even when the payloadCreator does not directly support the signal, no further actions are dispatched', async () => {
    const unawareAsyncThunk = createAsyncThunk('unaware', async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
      return 'finished'
    })

    const promise = store.dispatch(unawareAsyncThunk())
    promise.abort('AbortReason')
    const result = await promise

    const expectedAbortedAction = {
      type: 'unaware/rejected',
      error: {
        message: 'AbortReason',
        name: 'AbortError'
      }
    }

    // abortedAction with reason is dispatched after test/pending is dispatched
    expect(store.getState()).toEqual([
      expect.any(Object),
      expect.objectContaining({ type: 'unaware/pending' }),
      expect.objectContaining(expectedAbortedAction)
    ])

    // same abortedAction is returned, but with the AbortError from the abortablePayloadCreator
    expect(result).toMatchObject(expectedAbortedAction)

    // calling unwrapResult on the returned object re-throws the error from the abortablePayloadCreator
    expect(() => unwrapResult(result)).toThrowError(
      expect.objectContaining(expectedAbortedAction.error)
    )
  })

  test('dispatch(asyncThunk) returns on abort and does not wait for the promiseProvider to finish', async () => {
    let running = false
    const longRunningAsyncThunk = createAsyncThunk('longRunning', async () => {
      running = true
      await new Promise(resolve => setTimeout(resolve, 30000))
      running = false
    })

    const promise = store.dispatch(longRunningAsyncThunk())
    expect(running).toBeTruthy()
    promise.abort()
    const result = await promise
    expect(running).toBeTruthy()
    expect(result).toMatchObject({
      type: 'longRunning/rejected',
      error: { message: 'Aborted', name: 'AbortError' },
      meta: { aborted: true }
    })
  })

  describe('behaviour with missing AbortController', () => {
    let keepAbortController: typeof window['AbortController']
    let freshlyLoadedModule: typeof import('./createAsyncThunk')
    let restore: () => void
    let nodeEnv: string

    beforeEach(() => {
      keepAbortController = window.AbortController
      delete window.AbortController
      jest.resetModules()
      freshlyLoadedModule = require('./createAsyncThunk')
      restore = mockConsole(createConsole())
      nodeEnv = process.env.NODE_ENV!
      process.env.NODE_ENV = 'development'
    })

    afterEach(() => {
      process.env.NODE_ENV = nodeEnv
      restore()
      window.AbortController = keepAbortController
      jest.resetModules()
    })

    test('calling `abort` on an asyncThunk works with a FallbackAbortController if no global abortController is not available', async () => {
      const longRunningAsyncThunk = freshlyLoadedModule.createAsyncThunk(
        'longRunning',
        async () => {
          await new Promise(resolve => setTimeout(resolve, 30000))
        }
      )

      store.dispatch(longRunningAsyncThunk()).abort()
      // should only log once, even if called twice
      store.dispatch(longRunningAsyncThunk()).abort()

      expect(getLog().log).toMatchInlineSnapshot(`
        "This platform does not implement AbortController. 
        If you want to use the AbortController to react to \`abort\` events, please consider importing a polyfill like 'abortcontroller-polyfill/dist/abortcontroller-polyfill-only'."
      `)
    })
  })
})

test('non-serializable arguments are ignored by serializableStateInvariantMiddleware', async () => {
  const restore = mockConsole(createConsole())
  const nonSerializableValue = new Map()
  const asyncThunk = createAsyncThunk('test', (arg: Map<any, any>) => {})

  configureStore({
    reducer: () => 0
  }).dispatch(asyncThunk(nonSerializableValue))

  expect(getLog().log).toMatchInlineSnapshot(`""`)
  restore()
})
