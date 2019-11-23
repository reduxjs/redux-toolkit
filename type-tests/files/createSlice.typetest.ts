import { AnyAction, Reducer, Action } from 'redux'
import {
  createSlice,
  PayloadAction,
  createAction,
  ActionReducerMapBuilder
} from '../../src'

function expectType<T>(t: T) {
  return t
}

/*
 * Test: createSlice() infers the returned slice's type.
 */
{
  const firstAction = createAction<{ count: number }>('FIRST_ACTION')

  const slice = createSlice({
    name: 'counter',
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
}

/*
 * Test: Slice action creator types are inferred.
 */
{
  const counter = createSlice({
    name: 'counter',
    initialState: 0,
    reducers: {
      increment: state => state + 1,
      decrement: state => state - 1,
      multiply: (state, { payload }: PayloadAction<number | number[]>) =>
        Array.isArray(payload)
          ? payload.reduce((acc, val) => acc * val, state)
          : state * payload,
      addTwo: {
        reducer: (s, { payload }) => s + payload,
        prepare: (a: number, b: number) => ({
          payload: a + b
        })
      }
    }
  })

  counter.actions.increment()
  counter.actions.multiply(2)
  counter.actions.multiply([2, 3, 4])
  counter.actions.addTwo(1, 2)

  // typings:expect-error
  counter.actions.multiply()

  // typings:expect-error
  counter.actions.multiply('2')

  // typings:expect-error
  counter.actions.addTwo(1)
}

/*
 * Test: Slice action creator types properties are "string"
 */
{
  const counter = createSlice({
    name: 'counter',
    initialState: 0,
    reducers: {
      increment: state => state + 1,
      decrement: state => state - 1,
      multiply: (state, { payload }: PayloadAction<number | number[]>) =>
        Array.isArray(payload)
          ? payload.reduce((acc, val) => acc * val, state)
          : state * payload
    }
  })

  const s: string = counter.actions.increment.type
  const t: string = counter.actions.decrement.type
  const u: string = counter.actions.multiply.type

  // typings:expect-error
  const x: 'counter/increment' = counter.actions.increment.type
  // typings:expect-error
  const y: 'increment' = counter.actions.increment.type
}

/*
 * Test: Slice action creator types are inferred for enhanced reducers.
 */
{
  const counter = createSlice({
    name: 'test',
    initialState: { counter: 0, concat: '' },
    reducers: {
      incrementByStrLen: {
        reducer: (state, action: PayloadAction<number>) => {
          state.counter += action.payload
        },
        prepare: (payload: string) => ({
          payload: payload.length
        })
      },
      concatMetaStrLen: {
        reducer: (state, action: PayloadAction<string>) => {
          state.concat += action.payload
        },
        prepare: (payload: string) => ({
          payload,
          meta: payload.length
        })
      }
    }
  })

  expectType<string>(counter.actions.incrementByStrLen('test').type)
  expectType<number>(counter.actions.incrementByStrLen('test').payload)
  expectType<string>(counter.actions.concatMetaStrLen('test').payload)
  expectType<number>(counter.actions.concatMetaStrLen('test').meta)

  // typings:expect-error
  expectType<string>(counter.actions.incrementByStrLen('test').payload)

  // typings:expect-error
  expectType<string>(counter.actions.concatMetaStrLen('test').meta)
}

/*
 * Test: returned case reducer has the correct type
 */
{
  const counter = createSlice({
    name: 'counter',
    initialState: 0,
    reducers: {
      increment(state, action: PayloadAction<number>) {
        return state + action.payload
      },
      decrement: {
        reducer(state, action: PayloadAction<number>) {
          return state - action.payload
        },
        prepare(amount: number) {
          return { payload: amount }
        }
      }
    }
  })

  // Should match positively
  expectType<(state: number, action: PayloadAction<number>) => number | void>(
    counter.caseReducers.increment
  )

  // Should match positively for reducers with prepare callback
  expectType<(state: number, action: PayloadAction<number>) => number | void>(
    counter.caseReducers.decrement
  )

  // Should not mismatch the payload if it's a simple reducer
  // typings:expect-error
  expectType<(state: number, action: PayloadAction<string>) => number | void>(
    counter.caseReducers.increment
  )

  // Should not mismatch the payload if it's a reducer with a prepare callback
  // typings:expect-error
  expectType<(state: number, action: PayloadAction<string>) => number | void>(
    counter.caseReducers.decrement
  )

  // Should not include entries that don't exist
  // typings:expect-error
  expectType<(state: number, action: PayloadAction<string>) => number | void>(
    counter.caseReducers.someThingNonExistant
  )
}

/*
 * Test: prepared payload does not match action payload - should cause an error.
 */
{
  // typings:expect-error
  const counter = createSlice({
    name: 'counter',
    initialState: { counter: 0 },
    reducers: {
      increment: {
        reducer(state, action: PayloadAction<string>) {
          state.counter += action.payload.length
        },
        prepare(x: string) {
          return {
            payload: 6
          }
        }
      }
    }
  })
}

/*
 * Test: if no Payload Type is specified, accept any payload
 * see https://github.com/reduxjs/redux-toolkit/issues/165
 */
{
  const initialState = {
    name: null
  }

  const mySlice = createSlice({
    name: 'name',
    initialState,
    reducers: {
      setName: (state, action) => {
        state.name = action.payload
      }
    }
  })

  const x = mySlice.actions.setName

  mySlice.actions.setName(null)
  mySlice.actions.setName('asd')
  mySlice.actions.setName(5)
}

/**
 * Test: actions.x.match()
 */
{
  const mySlice = createSlice({
    name: 'name',
    initialState: { name: 'test' },
    reducers: {
      setName: (state, action: PayloadAction<string>) => {
        state.name = action.payload
      }
    }
  })

  const x: Action<unknown> = {} as any
  if (mySlice.actions.setName.match(x)) {
    expectType<string>(x.type)
    expectType<string>(x.payload)
  } else {
    // typings:expect-error
    expectType<string>(x.type)
    // typings:expect-error
    expectType<string>(x.payload)
  }
}

/** Test:  alternative builder callback for extraReducers */
{
  createSlice({
    name: 'test',
    initialState: 0,
    reducers: {},
    extraReducers: builder => {
      expectType<ActionReducerMapBuilder<number>>(builder)
    }
  })
}
