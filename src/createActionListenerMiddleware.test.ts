import { configureStore } from './configureStore'
import {
  createActionListenerMiddleware,
  addListenerAction,
  removeListenerAction
} from './createActionListenerMiddleware'
import { createAction } from './createAction'

const middlewareApi = {
  getState: expect.any(Function),
  dispatch: expect.any(Function)
}

describe('createActionListenerMiddleware', () => {
  let store = configureStore({
    reducer: () => ({}),
    middleware: [createActionListenerMiddleware()] as const
  })
  let reducer: jest.Mock
  let middleware: ReturnType<typeof createActionListenerMiddleware>

  const testAction1 = createAction<string>('testAction1')
  type TestAction1 = ReturnType<typeof testAction1>
  const testAction2 = createAction<string>('testAction2')

  beforeEach(() => {
    middleware = createActionListenerMiddleware()
    reducer = jest.fn(() => ({}))
    store = configureStore({
      reducer,
      middleware: [middleware] as const
    })
  })

  test('directly subscribing', () => {
    const listener = jest.fn((_: TestAction1) => {})

    middleware.addListener(testAction1, listener)

    store.dispatch(testAction1('a'))
    store.dispatch(testAction2('b'))
    store.dispatch(testAction1('c'))

    expect(listener.mock.calls).toEqual([
      [testAction1('a'), middlewareApi],
      [testAction1('c'), middlewareApi]
    ])
  })

  test('subscribing with the same listener will not make it trigger twice (like EventTarget.addEventListener())', () => {
    /**
     * thoughts: allow to use this to override the options for a listener?
     * right now it's just exiting if the listener is already registered
     */

    const listener = jest.fn((_: TestAction1) => {})

    middleware.addListener(testAction1, listener)
    middleware.addListener(testAction1, listener)

    store.dispatch(testAction1('a'))
    store.dispatch(testAction2('b'))
    store.dispatch(testAction1('c'))

    expect(listener.mock.calls).toEqual([
      [testAction1('a'), middlewareApi],
      [testAction1('c'), middlewareApi]
    ])
  })

  test('unsubscribing via callback', () => {
    const listener = jest.fn((_: TestAction1) => {})

    const unsubscribe = middleware.addListener(testAction1, listener)

    store.dispatch(testAction1('a'))
    unsubscribe()
    store.dispatch(testAction2('b'))
    store.dispatch(testAction1('c'))

    expect(listener.mock.calls).toEqual([[testAction1('a'), middlewareApi]])
  })

  test('directly unsubscribing', () => {
    const listener = jest.fn((_: TestAction1) => {})

    middleware.addListener(testAction1, listener)

    store.dispatch(testAction1('a'))

    middleware.removeListener(testAction1, listener)
    store.dispatch(testAction2('b'))
    store.dispatch(testAction1('c'))

    expect(listener.mock.calls).toEqual([[testAction1('a'), middlewareApi]])
  })

  test('subscribing via action', () => {
    const listener = jest.fn((_: TestAction1) => {})

    store.dispatch(addListenerAction(testAction1, listener))

    store.dispatch(testAction1('a'))
    store.dispatch(testAction2('b'))
    store.dispatch(testAction1('c'))

    expect(listener.mock.calls).toEqual([
      [testAction1('a'), middlewareApi],
      [testAction1('c'), middlewareApi]
    ])
  })

  test('unsubscribing via callback from dispatch', () => {
    const listener = jest.fn((_: TestAction1) => {})

    const unsubscribe = store.dispatch(addListenerAction(testAction1, listener))

    store.dispatch(testAction1('a'))
    // @ts-ignore TODO types
    unsubscribe()
    store.dispatch(testAction2('b'))
    store.dispatch(testAction1('c'))

    expect(listener.mock.calls).toEqual([[testAction1('a'), middlewareApi]])
  })

  test('unsubscribing via action', () => {
    const listener = jest.fn((_: TestAction1) => {})

    middleware.addListener(testAction1, listener)

    store.dispatch(testAction1('a'))

    store.dispatch(removeListenerAction(testAction1, listener))
    store.dispatch(testAction2('b'))
    store.dispatch(testAction1('c'))

    expect(listener.mock.calls).toEqual([[testAction1('a'), middlewareApi]])
  })

  test('"condition" allows to skip the listener', () => {
    const listener = jest.fn((_: TestAction1) => {})

    middleware.addListener(testAction1, listener, {
      condition(action) {
        return action.payload !== 'b'
      }
    })

    store.dispatch(testAction1('a'))
    store.dispatch(testAction1('b'))
    store.dispatch(testAction1('c'))

    expect(listener.mock.calls).toEqual([
      [testAction1('a'), middlewareApi],
      [testAction1('c'), middlewareApi]
    ])
  })

  test('"once" unsubscribes the listener automatically after one use', () => {
    const listener = jest.fn((_: TestAction1) => {})

    middleware.addListener(testAction1, listener, {
      once: true
    })

    store.dispatch(testAction1('a'))
    store.dispatch(testAction1('b'))
    store.dispatch(testAction1('c'))

    expect(listener.mock.calls).toEqual([[testAction1('a'), middlewareApi]])
  })

  test('combining "once" with "condition', () => {
    const listener = jest.fn((_: TestAction1) => {})

    middleware.addListener(testAction1, listener, {
      once: true,
      condition(action) {
        return action.payload === 'b'
      }
    })

    store.dispatch(testAction1('a'))
    store.dispatch(testAction1('b'))
    store.dispatch(testAction1('c'))

    expect(listener.mock.calls).toEqual([[testAction1('b'), middlewareApi]])
  })

  test('by default, actions are forwarded to the store', () => {
    reducer.mockClear()

    const listener = jest.fn((_: TestAction1) => {})

    middleware.addListener(testAction1, listener)

    store.dispatch(testAction1('a'))

    expect(reducer.mock.calls).toEqual([[{}, testAction1('a')]])
  })

  test('"preventPropagation" prevents actions from being forwarded to the store', () => {
    reducer.mockClear()

    const listener = jest.fn((_: TestAction1) => {})

    middleware.addListener(testAction1, listener, { preventPropagation: true })

    store.dispatch(testAction1('a'))

    expect(reducer.mock.calls).toEqual([])
  })

  test('combining "preventPropagation" and "condition', () => {
    reducer.mockClear()

    const listener = jest.fn((_: TestAction1) => {})

    middleware.addListener(testAction1, listener, {
      preventPropagation: true,
      condition(action) {
        return action.payload === 'b'
      }
    })

    store.dispatch(testAction1('a'))
    store.dispatch(testAction1('b'))
    store.dispatch(testAction1('c'))

    expect(reducer.mock.calls).toEqual([
      [{}, testAction1('a')],
      [{}, testAction1('c')]
    ])
  })
})
