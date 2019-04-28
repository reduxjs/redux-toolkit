import { Reducer } from 'redux'
import { configureStore } from './configureStore'

import {
  createSerializableStateInvariantMiddleware,
  findNonSerializableValue
} from './serializableStateInvariantMiddleware'

describe('findNonSerializableValue', () => {
  it('Should return false if no matching values are found', () => {
    const obj = {
      a: 42,
      b: {
        b1: 'test'
      },
      c: [99, { d: 123 }]
    }

    const result = findNonSerializableValue(obj)

    expect(result).toBe(false)
  })

  it('Should return a keypath and the value if it finds a non-serializable value', () => {
    function testFunction() {}

    const obj = {
      a: 42,
      b: {
        b1: testFunction
      },
      c: [99, { d: 123 }]
    }

    const result = findNonSerializableValue(obj)

    expect(result).toEqual({ keyPath: 'b.b1', value: testFunction })
  })

  it('Should return the first non-serializable value it finds', () => {
    const map = new Map()
    const symbol = Symbol.for('testSymbol')

    const obj = {
      a: 42,
      b: {
        b1: 1
      },
      c: [99, { d: 123 }, map, symbol, 'test'],
      d: symbol
    }

    const result = findNonSerializableValue(obj)

    expect(result).toEqual({ keyPath: 'c.2', value: map })
  })

  it('Should return a specific value if the root object is non-serializable', () => {
    const value = new Map()
    const result = findNonSerializableValue(value)

    expect(result).toEqual({ keyPath: '<root>', value })
  })

  it('Should accept null as a valid value', () => {
    const obj = {
      a: 42,
      b: {
        b1: 1
      },
      c: null
    }

    const result = findNonSerializableValue(obj)

    expect(result).toEqual(false)
  })
})

describe('serializableStateInvariantMiddleware', () => {
  beforeEach(() => {
    console.error = jest.fn()
  })

  it('Should log an error when a non-serializable action is dispatched', () => {
    const reducer: Reducer = (state = 0, _action) => state + 1

    const serializableStateInvariantMiddleware = createSerializableStateInvariantMiddleware()

    const store = configureStore({
      reducer,
      middleware: [serializableStateInvariantMiddleware]
    })

    const type = Symbol.for('SOME_CONSTANT')
    const dispatchedAction = { type }

    store.dispatch(dispatchedAction)

    expect(console.error).toHaveBeenCalled()

    const [
      message,
      keyPath,
      value,
      action
    ] = (console.error as jest.Mock).mock.calls[0]

    expect(message).toContain('detected in an action, in the path: `%s`')
    expect(keyPath).toBe('type')
    expect(value).toBe(type)
    expect(action).toBe(dispatchedAction)
  })

  it('Should log an error when a non-serializable value is in state', () => {
    const ACTION_TYPE = 'TEST_ACTION'

    const initialState = {
      a: 0
    }

    const badValue = new Map()

    const reducer: Reducer = (state = initialState, action) => {
      switch (action.type) {
        case ACTION_TYPE: {
          return {
            a: badValue
          }
        }
        default:
          return state
      }
    }

    const serializableStateInvariantMiddleware = createSerializableStateInvariantMiddleware()

    const store = configureStore({
      reducer: {
        testSlice: reducer
      },
      middleware: [serializableStateInvariantMiddleware]
    })

    store.dispatch({ type: ACTION_TYPE })

    expect(console.error).toHaveBeenCalled()

    const [
      message,
      keyPath,
      value,
      actionType
    ] = (console.error as jest.Mock).mock.calls[0]

    expect(message).toContain('detected in the state, in the path: `%s`')
    expect(keyPath).toBe('testSlice.a')
    expect(value).toBe(badValue)
    expect(actionType).toBe(ACTION_TYPE)
  })
})
