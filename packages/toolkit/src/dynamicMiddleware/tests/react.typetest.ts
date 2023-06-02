/* eslint-disable no-lone-blocks */
import type { Context } from 'react'
import type { ReactReduxContextValue } from 'react-redux'
import type { Action, UnknownAction, Middleware } from 'redux'
import type { ThunkDispatch } from 'redux-thunk'
import { createDynamicMiddleware } from '../react'
import { expectExactType, expectType } from '../../tests/helpers'
/* eslint-disable no-lone-blocks */

interface AppDispatch extends ThunkDispatch<number, undefined, UnknownAction> {
  (n: 1): 1
}

const untypedInstance = createDynamicMiddleware()

const typedInstance = createDynamicMiddleware<number, AppDispatch>()

declare const compatibleMiddleware: Middleware<{}, number, AppDispatch>
declare const incompatibleMiddleware: Middleware<{}, string, AppDispatch>

declare const customContext: Context<ReactReduxContextValue>

/**
 * Test: instance typed at creation enforces correct middleware type
 */
{
  const useDispatch = typedInstance.createDispatchWithMiddlewareHook(
    compatibleMiddleware,
    // @ts-expect-error
    incompatibleMiddleware
  )

  const createDispatchWithMiddlewareHook =
    typedInstance.createDispatchWithMiddlewareHookFactory(customContext)
  const useDispatchWithContext = createDispatchWithMiddlewareHook(
    compatibleMiddleware,
    // @ts-expect-error
    incompatibleMiddleware
  )
}

/**
 * Test: withTypes() enforces correct middleware type
 */
{
  const createDispatchWithMiddlewareHook =
    untypedInstance.createDispatchWithMiddlewareHook.withTypes<{
      state: number
      dispatch: AppDispatch
    }>()
  const useDispatch = createDispatchWithMiddlewareHook(
    compatibleMiddleware,
    // @ts-expect-error
    incompatibleMiddleware
  )

  const createCustomDispatchWithMiddlewareHook = untypedInstance
    .createDispatchWithMiddlewareHookFactory(customContext)
    .withTypes<{
      state: number
      dispatch: AppDispatch
    }>()
  const useCustomDispatch = createCustomDispatchWithMiddlewareHook(
    compatibleMiddleware,
    // @ts-expect-error
    incompatibleMiddleware
  )
}

declare const addedMiddleware: Middleware<(n: 2) => 2>

/**
 * Test: useDispatchWithMW returns typed dispatch, with any applicable extensions
 */
{
  const useDispatchWithMW =
    typedInstance.createDispatchWithMiddlewareHook(addedMiddleware)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const dispatch = useDispatchWithMW()

  // standard
  expectType<Action<string>>(dispatch({ type: 'foo' }))
  // thunk
  expectType<string>(dispatch(() => 'foo'))
  // static
  expectExactType(1 as const)(dispatch(1))
  // added
  expectExactType(2 as const)(dispatch(2))
}
