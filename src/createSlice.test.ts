import { createSlice } from './createSlice'
import { createAction, PayloadAction } from './createAction'

describe('createSlice', () => {
  const slice = createSlice({
    name: 'counter',
    initialState: 0,
    actions: {
      increment: state => state + 1,
      multiply: (state, { payload }: PayloadAction<number>) => state * payload
    }
  })

  it('should create action creators for `actions`', () => {
    expect(slice.actions).toHaveProperty('increment')
    expect(slice.actions).toHaveProperty('multiply')
  })

  it('should namespace action types', () => {
    expect(slice.actions.increment().type).toBe('counter/increment')
    expect(slice.actions.multiply(2).type).toBe('counter/multiply')
  })

  it('should support action payloads', () => {
    expect(slice.actions.multiply(2).payload).toBe(2)
  })

  it('should not generate action creators for `extraReducers`', () => {
    expect(slice.actions).not.toHaveProperty('RESET_APP')
  })

  it('should apply case reducers passed in `actions`', () => {
    const state1 = slice(undefined, slice.actions.increment())
    const state2 = slice(state1, slice.actions.multiply(3))
    expect(state1).toBe(1)
    expect(state2).toBe(3)
  })
})

describe('when mutating state object', () => {
  const initialState = { user: '' }

  const slice = createSlice({
    name: 'user',
    actions: {
      setUserName: (state, action) => {
        state.user = action.payload
      }
    },
    initialState
  })

  it('should set the username', () => {
    expect(slice(initialState, slice.actions.setUserName('eric'))).toEqual({
      user: 'eric'
    })
  })
})

describe('when passing extra reducers', () => {
  const addMore = createAction('ADD_MORE')

  const slice = createSlice({
    name: 'counter',
    actions: {
      increment: state => state + 1,
      multiply: (state, action) => state * action.payload
    },
    extraReducers: {
      [addMore.type]: (state, action) => state + action.payload.amount
    },
    initialState: 0
  })

  it('should call extra reducers when their actions are dispatched', () => {
    const result = slice(10, addMore({ amount: 5 }))

    expect(result).toBe(15)
  })

  it('should not generate action creators for extra reducers ', () => {
    expect(slice.actions).not.toHaveProperty('RESET_APP')
  })
})
