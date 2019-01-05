import {
  AnyAction,
  createSlice,
  PayloadAction,
  Reducer
} from 'redux-starter-kit'

/*
 * Test: createSlice() infers the returned slice's type.
 */
{
  const slice = createSlice({
    slice: 'counter',
    initialState: 0,
    reducers: {
      increment: (state: number, action: PayloadAction) =>
        state + action.payload,
      decrement: (state: number, action: PayloadAction) =>
        state - action.payload
    }
  })

  /* Reducer */

  const reducer: Reducer<number, PayloadAction> = slice.reducer

  // typings:expect-error
  const stringReducer: Reducer<string, PayloadAction> = slice.reducer
  // typings:expect-error
  const anyActionReducer: Reducer<string, AnyAction> = slice.reducer

  /* Actions */

  slice.actions.increment(1)
  slice.actions.decrement(1)

  // typings:expect-error
  slice.actions.other(1)

  /* Selector */

  const value: number = slice.selectors.getCounter(0)

  // typings:expect-error
  const stringValue: string = slice.selectors.getCounter(0)
}
