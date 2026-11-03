import type {
  Action,
  Dispatch,
  Middleware,
  TypedAddListenerAction,
  TypedRemoveListenerAction,
  UnknownAction,
} from '@reduxjs/toolkit'
import { addListener, createAction, removeListener } from '@reduxjs/toolkit'

interface CounterState {
  value: number
}

type AppDispatch = Dispatch<UnknownAction>

const increment = createAction<number>('counter/increment')

describe('listener action types', () => {
  test('TypedAddListenerAction describes the dispatched add action', () => {
    type AddAction = TypedAddListenerAction<CounterState, AppDispatch, string>

    expectTypeOf<AddAction['type']>().toEqualTypeOf<'listenerMiddleware/add'>()
    expectTypeOf<AddAction['payload']['type']>().toEqualTypeOf<
      string | undefined
    >()
    expectTypeOf<AddAction['payload']['effect']>()
      .parameter(0)
      .toEqualTypeOf<UnknownAction>()
    expectTypeOf<AddAction['payload']['effect']>()
      .parameter(1)
      .toHaveProperty('extra')
      .toEqualTypeOf<string>()
    expectTypeOf<AddAction['payload']['effect']>()
      .parameter(1)
      .toHaveProperty('getState')
      .returns.toEqualTypeOf<CounterState>()
    expectTypeOf<AddAction['payload']['predicate']>()
      .exclude<undefined>()
      .parameter(1)
      .toEqualTypeOf<CounterState>()
    expectTypeOf<AddAction['payload']['matcher']>()
      .exclude<undefined>()
      .guards.toEqualTypeOf<Action>()
  })

  test('TypedRemoveListenerAction includes unsubscribe options', () => {
    type RemoveAction = TypedRemoveListenerAction<CounterState>

    expectTypeOf<
      RemoveAction['type']
    >().toEqualTypeOf<'listenerMiddleware/remove'>()
    expectTypeOf<RemoveAction['payload']>().toHaveProperty('cancelActive')
    expectTypeOf<RemoveAction['payload']>().toHaveProperty('effect')
  })

  test('accepts the options passed to addListener and removeListener', () => {
    const options = {
      actionCreator: increment,
      effect: () => {},
    }

    expectTypeOf(options).toExtend<
      TypedAddListenerAction<CounterState>['payload']
    >()

    expectTypeOf({
      ...options,
      cancelActive: true as const,
    }).toExtend<TypedRemoveListenerAction<CounterState>['payload']>()
  })

  test('can type a middleware that inspects listener actions', () => {
    const isAddListenerAction = (
      action: unknown,
    ): action is TypedAddListenerAction<CounterState> =>
      addListener.match(action)

    const isRemoveListenerAction = (
      action: unknown,
    ): action is TypedRemoveListenerAction<CounterState> =>
      removeListener.match(action)

    const middleware: Middleware<{}, CounterState> =
      () => (next) => (action) => {
        if (isAddListenerAction(action)) {
          expectTypeOf(action.payload.type).toEqualTypeOf<string | undefined>()
        }
        if (isRemoveListenerAction(action)) {
          expectTypeOf(action.payload.cancelActive).toEqualTypeOf<
            true | undefined
          >()
        }
        return next(action)
      }

    expectTypeOf(middleware).toBeFunction()
  })
})
