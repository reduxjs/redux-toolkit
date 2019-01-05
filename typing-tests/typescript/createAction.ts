import { createAction, PayloadAction, ActionCreator } from 'redux-starter-kit'

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
 * Test: PayloadAction has optional second type parameter for the type tag.
 */
{
  const action: PayloadAction<number, string> = { type: '', payload: 5 }

  // typings:expect-error
  const action2: PayloadAction<number, string> = { type: 1, payload: 5 }

  // typings:expect-error
  const action3: PayloadAction<number, number> = { type: '', payload: 5 }
}

/* createAction() */

/*
 * Test: createAction() has type parameter for the action payload.
 */
{
  const increment = createAction<number>('increment')
  const incrementNumber: ActionCreator<PayloadAction<number>> = increment

  // typings:expect-error
  const incrementString: ActionCreator<PayloadAction<string>> = increment
}

/*
 * Test: createAction() type parameter is optional (defaults to `any`).
 */
{
  const increment = createAction('increment')
  const incrementNumber: ActionCreator<PayloadAction<number>> = increment
  const incrementString: ActionCreator<PayloadAction<string>> = increment
}
