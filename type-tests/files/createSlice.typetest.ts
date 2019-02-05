import {
  AnyAction,
  createSlice,
  PayloadAction,
  Reducer,
  createAction
} from 'redux-starter-kit'

/*
 * Test: createSlice() infers the returned slice's type.
 */
{
  const firstAction = createAction<{ count: number }>('FIRST_ACTION')

  const slice = createSlice({
    name: 'counter',
    initialState: 0,
    actions: {
      increment: (state: number, action) => state + action.payload,
      decrement: (state: number, action) => state - action.payload
    },
    extraReducers: {
      [firstAction.type]: (state: number, action) =>
        state + action.payload.count
    }
  })

  /* Reducer */

  const reducer: Reducer<number, PayloadAction> = slice

  // typings:expect-error
  const stringReducer: Reducer<string, PayloadAction> = slice
  // typings:expect-error
  const anyActionReducer: Reducer<string, AnyAction> = slice

  /* Actions */

  slice.actions.increment(1)
  slice.actions.decrement(1)

  // typings:expect-error
  slice.actions.other(1)
}

/*
 * Test: Slice action creator types are inferred.
 */
{
  const counter = createSlice({
    name: 'counter',
    initialState: 0,
    actions: {
      increment: state => state + 1,
      decrement: state => state - 1,
      multiply: (state, action: PayloadAction<number>) => state * action.payload
    }
  })

  counter.actions.increment()
  counter.actions.multiply(2)

  // typings:expect-error
  counter.actions.multiply()

  // typings:expect-error
  counter.actions.multiply('2')
}
