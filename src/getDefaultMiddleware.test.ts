import { AnyAction } from 'redux'
import { getDefaultMiddleware } from './getDefaultMiddleware'
import { configureStore } from './configureStore'
import thunk, { ThunkAction } from 'redux-thunk'

describe('getDefaultMiddleware', () => {
  const ORIGINAL_NODE_ENV = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV
  })

  it('returns an array with only redux-thunk in production', () => {
    process.env.NODE_ENV = 'production'

    expect(getDefaultMiddleware()).toEqual([thunk])
  })

  it('returns an array with additional middleware in development', () => {
    const middleware = getDefaultMiddleware()
    expect(middleware).toContain(thunk)
    expect(middleware.length).toBeGreaterThan(1)
  })

  it('removes the thunk middleware if disabled', () => {
    const middleware = getDefaultMiddleware({ thunk: false })
    expect(middleware.includes(thunk)).toBe(false)
    expect(middleware.length).toBe(2)
  })

  it('removes the immutable middleware if disabled', () => {
    const defaultMiddleware = getDefaultMiddleware()
    const middleware = getDefaultMiddleware({ immutableCheck: false })
    expect(middleware.length).toBe(defaultMiddleware.length - 1)
  })

  it('removes the serializable middleware if disabled', () => {
    const defaultMiddleware = getDefaultMiddleware()
    const middleware = getDefaultMiddleware({ serializableCheck: false })
    expect(middleware.length).toBe(defaultMiddleware.length - 1)
  })

  it('allows passing options to thunk', () => {
    const extraArgument = 42
    const middleware = getDefaultMiddleware({
      thunk: { extraArgument },
      immutableCheck: false,
      serializableCheck: false
    })

    const testThunk: ThunkAction<void, {}, number, AnyAction> = (
      dispatch,
      getState,
      extraArg
    ) => {
      expect(extraArg).toBe(extraArgument)
    }

    const reducer = () => ({})

    const store = configureStore({
      reducer,
      middleware
    })

    store.dispatch(testThunk)
  })

  it('allows passing options to immutableCheck', () => {
    let immutableCheckWasCalled = false

    const middleware = getDefaultMiddleware({
      thunk: false,
      immutableCheck: {
        isImmutable: () => {
          immutableCheckWasCalled = true
          return true
        }
      },
      serializableCheck: false
    })

    const reducer = () => ({})

    const store = configureStore({
      reducer,
      middleware
    })

    expect(immutableCheckWasCalled).toBe(true)
  })

  it('allows passing options to serializableCheck', () => {
    let serializableCheckWasCalled = false

    const middleware = getDefaultMiddleware({
      thunk: false,
      immutableCheck: false,
      serializableCheck: {
        isSerializable: () => {
          serializableCheckWasCalled = true
          return true
        }
      }
    })

    const reducer = () => ({})

    const store = configureStore({
      reducer,
      middleware
    })

    store.dispatch({ type: 'TEST_ACTION' })

    expect(serializableCheckWasCalled).toBe(true)
  })
})
