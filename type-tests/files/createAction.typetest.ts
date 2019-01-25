import {
  createAction,
  PayloadAction,
  ActionCreator,
  PayloadActionCreator,
  Action,
  AnyAction
} from 'redux-starter-kit'

/* PayloadAction */

/*
 * Test: PayloadAction has type parameter for the payload.
 */
{
  const action: PayloadAction<number> = { type: '', payload: 5 }
  const numberPayload: number = action.payload

  // typings:expect-error
  const stringPayload: string = action.payload
}

/*
 * Test: PayloadAction type parameter is optional (defaults to `any`).
 */
{
  const action: PayloadAction = { type: '', payload: 5 }
  const numberPayload: number = action.payload
  const stringPayload: string = action.payload
}

/*
 * Test: PayloadAction has a string type tag.
 */
{
  const action: PayloadAction = { type: '', payload: 5 }

  // typings:expect-error
  const action2: PayloadAction = { type: 1, payload: 5 }
}

/*
 * Test: PayloadAction is compatible with Action<string>
 */
{
  const action: PayloadAction = { type: '', payload: 5 }
  const stringAction: Action<string> = action
}

/* PayloadActionCreator */

/*
 * Test: PayloadActionCreator returns Action or PayloadAction depending
 * on whether a payload is passed.
 */
{
  const actionCreator: PayloadActionCreator = Object.assign(
    (payload?: number) => ({
      type: 'action',
      payload
    }),
    { type: 'action' }
  )

  let action: Action
  let payloadAction: PayloadAction

  action = actionCreator()
  action = actionCreator(1)
  payloadAction = actionCreator(1)

  // typings:expect-error
  payloadAction = actionCreator()
}

/*
 * Test: PayloadActionCreator is compatible with ActionCreator.
 */
{
  const payloadActionCreator: PayloadActionCreator = Object.assign(
    (payload?: number) => ({
      type: 'action',
      payload
    }),
    { type: 'action' }
  )
  const actionCreator: ActionCreator<AnyAction> = payloadActionCreator

  const payloadActionCreator2: PayloadActionCreator<number> = Object.assign(
    (payload?: number) => ({
      type: 'action',
      payload: payload || 1
    }),
    { type: 'action' }
  )

  const actionCreator2: ActionCreator<
    PayloadAction<number>
  > = payloadActionCreator2
}

/* createAction() */

/*
 * Test: createAction() has type parameter for the action payload.
 */
{
  const increment = createAction<number, 'increment'>('increment')
  const n: number = increment(1).payload

  // typings:expect-error
  const s: string = increment(1).payload
}

/*
 * Test: createAction() type parameter is optional (defaults to `any`).
 */
{
  const increment = createAction('increment')
  const n: number = increment(1).payload
  const s: string = increment(1).payload
}
/*
 * Test: createAction().type is a string literal.
 */
{
  const increment = createAction('increment')
  const n: string = increment(1).type
  const s: 'increment' = increment(1).type

  // typings:expect-error
  const r: 'other' = increment(1).type
  // typings:expect-error
  const q: number = increment(1).type
}
