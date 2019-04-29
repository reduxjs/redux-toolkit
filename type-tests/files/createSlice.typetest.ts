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
    slice: 'counter',
    initialState: 0,
    reducers: {
      increment: (state: number, action) => state + action.payload,
      decrement: (state: number, action) => state - action.payload
    },
    extraReducers: {
      [firstAction.type]: (state: number, action) =>
        state + action.payload.count
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

/*
 * Test: Slice action creator types are inferred.
 */
{
  const counter = createSlice({
    slice: 'counter',
    initialState: 0,
    reducers: {
      increment: state => state + 1,
      decrement: state => state - 1,
      multiply: (state, action: PayloadAction<number, 'counter/multiply'>) =>
        state * action.payload
    }
  })

  counter.actions.increment()
  counter.actions.multiply(2)

  // typings:expect-error
  counter.actions.multiply()

  // typings:expect-error
  counter.actions.multiply('2')
}

/** Test: Typecasting of payload types works as expected */
{
  const formInitialState = {
    name: '',
    surname: '',
    middlename: ''
  }

  const formSlice = createSlice({
    slice: 'form',
    reducers: {
      setName: (state, action: PayloadAction<string, 'form/setName'>) => {
        state.name = action.payload
      },
      setSurname: (state, action: PayloadAction<string, 'form/setSurname'>) => {
        state.surname = action.payload
      },
      setMiddlename: (
        state,
        action: PayloadAction<string, 'form/setMiddlename'>
      ) => {
        state.middlename = action.payload
      },
      resetForm: (state, _: PayloadAction<undefined, 'form/resetForm'>) =>
        formInitialState
    },
    initialState: formInitialState
  })

  let setName: {
    (payload: string): PayloadAction<string, 'form/setName'>
    type: 'form/setName'
  }

  let setMiddlename: {
    (payload: string): PayloadAction<string, 'form/setMiddlename'>
    type: 'form/setMiddlename'
  }

  let setSurname: {
    (payload: string): PayloadAction<string, 'form/setSurname'>
    type: 'form/setSurname'
  }

  let resetForm: {
    (): PayloadAction<undefined, 'form/resetForm'>
    type: 'form/resetForm'
  }

  setName = formSlice.actions.setName
  setSurname = formSlice.actions.setSurname
  setMiddlename = formSlice.actions.setMiddlename
  resetForm = formSlice.actions.resetForm
}
