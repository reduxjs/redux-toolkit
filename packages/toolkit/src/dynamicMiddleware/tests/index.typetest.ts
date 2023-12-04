/* eslint-disable no-lone-blocks */
import type { Action, UnknownAction, Middleware } from 'redux'
import type { ThunkDispatch } from 'redux-thunk'
import { createDynamicMiddleware } from '../index'
import { configureStore } from '../../configureStore'
import { expectExactType, expectType } from '../../tests/helpers'

const untypedInstance = createDynamicMiddleware()

interface AppDispatch extends ThunkDispatch<number, undefined, UnknownAction> {
  (n: 1): 1
}

const typedInstance = createDynamicMiddleware<number, AppDispatch>()

/**
 * Test: instance typed at creation ensures middleware compatibility with store
 */
{
  const store = configureStore({
    reducer: () => '',
    // @ts-expect-error
    middleware: (gDM) => gDM().prepend(typedInstance.middleware),
  })
}

declare const staticMiddleware: Middleware<(n: 1) => 1>

const store = configureStore({
  reducer: () => 0,
  middleware: (gDM) =>
    gDM().prepend(typedInstance.middleware).concat(staticMiddleware),
})

declare const compatibleMiddleware: Middleware<{}, number, AppDispatch>
declare const incompatibleMiddleware: Middleware<{}, string, AppDispatch>

/**
 * Test: instance typed at creation enforces correct middleware type
 */
{
  typedInstance.addMiddleware(
    compatibleMiddleware,
    // @ts-expect-error
    incompatibleMiddleware
  )

  const dispatch = store.dispatch(
    typedInstance.withMiddleware(
      compatibleMiddleware,
      // @ts-expect-error
      incompatibleMiddleware
    )
  )
}

/**
 * Test: withTypes() enforces correct middleware type
 */
{
  const addMiddleware = untypedInstance.addMiddleware.withTypes<{
    state: number
    dispatch: AppDispatch
  }>()

  addMiddleware(
    compatibleMiddleware,
    // @ts-expect-error
    incompatibleMiddleware
  )

  const withMiddleware = untypedInstance.withMiddleware.withTypes<{
    state: number
    dispatch: AppDispatch
  }>()

  const dispatch = store.dispatch(
    withMiddleware(
      compatibleMiddleware,
      // @ts-expect-error
      incompatibleMiddleware
    )
  )
}

declare const addedMiddleware: Middleware<(n: 2) => 2>

/**
 * Test: withMiddleware returns typed dispatch, with any applicable extensions
 */
{
  const dispatch = store.dispatch(typedInstance.withMiddleware(addedMiddleware))

  // standard
  expectType<Action<string>>(dispatch({ type: 'foo' }))
  // thunk
  expectType<string>(dispatch(() => 'foo'))
  // static
  expectExactType(1 as const)(dispatch(1))
  // added
  expectExactType(2 as const)(dispatch(2))
}
