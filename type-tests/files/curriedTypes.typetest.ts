import { useDispatch, useSelector } from 'react-redux'
import { configureStore, createAsyncThunk, createThunk, Middleware } from 'src'

type DispatchType = typeof store.dispatch
type StateType = ReturnType<typeof store.getState>

const otherMiddleware: Middleware<
  { (arg: number): number },
  any,
  any
> = _ => next => action => next(action)

const store = configureStore({
  reducer(state?: { foo: 'bar' }) {
    return state!
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      thunk: { extraArgument: 'thunkExtra' as const }
    }).concat(otherMiddleware)
})

function expectType<T>(t: T) {
  return t
}
// currying `useDispatch`
{
  expectType<() => DispatchType>(store.withCurriedTypes(useDispatch))
}

// currying `useSelector`
{
  expectType<
    <X>(
      selector: (state: StateType) => X,
      equalityFn?: (x1: X, x2: X) => boolean
    ) => any
  >(store.withCurriedTypes(useSelector))
}

/**
 * currying a lot of stuff
 */
{
  const {
    useDispatch: useAppDispatch,
    useSelector: useAppSelector
  } = store.withCurriedTypes({
    useDispatch,
    useSelector
  })

  expectType<() => DispatchType>(useAppDispatch)

  // typings:expect-error does not accept wrong types for a key
  store.withCurriedTypes({ useDispatch: () => {} })

  // typings:expect-error will not have stuff in the output that is not in the input
  const { useDispatch: notThere } = store.withCurriedTypes({})
}

/**
 * currying all supported exports of react-redux at once
 */
{
  const {
    useDispatch,
    useSelector,
    connect,
    connectAdvanced
  } = store.withCurriedTypes(require('react-redux'))
}
/**
 * currying `createAsyncThunk`
 */
{
  const curriedCAT = store.withCurriedTypes(createAsyncThunk)
  curriedCAT('foo', (arg: any, { getState, dispatch, extra }) => {
    expectType<DispatchType>(dispatch)
    expectType<StateType>(getState())
    expectType<'thunkExtra'>(extra)
  })
}
/**
 * currying `createThunk`
 */
{
  const curriedCT = store.withCurriedTypes(createThunk)

  const thunk = curriedCT(
    (arg1: string, arg2: number) => (dispatch, getState, extra) => {
      expectType<DispatchType>(dispatch)
      expectType<StateType>(getState())
      expectType<'thunkExtra'>(extra)
      return null
    }
  )
}
