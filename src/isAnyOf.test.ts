import { isAnyOf } from './isAnyOf'
import { createAction } from './createAction'
import { createAsyncThunk } from './createAsyncThunk'
import { createReducer } from './createReducer'

describe('isAnyOf', () => {
  it('returns true only if any matchers match (match function)', () => {
    const actionA = createAction<string>('a')
    const actionB = createAction<number>('b')

    const trueAction = {
      type: 'a',
      payload: 'payload'
    }

    expect(isAnyOf(actionA, actionB)(trueAction)).toEqual(true)

    const falseAction = {
      type: 'c',
      payload: 'payload'
    }

    expect(isAnyOf(actionA, actionB)(falseAction)).toEqual(false)
  })

  it('returns true only if any type guards match', () => {
    const actionA = createAction<string>('a')
    const actionB = createAction<number>('b')

    const isActionA = actionA.match
    const isActionB = actionB.match

    const trueAction = {
      type: 'a',
      payload: 'payload'
    }

    expect(isAnyOf(isActionA, isActionB)(trueAction)).toEqual(true)

    const falseAction = {
      type: 'c',
      payload: 'payload'
    }

    expect(isAnyOf(isActionA, isActionB)(falseAction)).toEqual(false)
  })

  it('returns true only if any matchers match (thunk action creators)', () => {
    const thunkA = createAsyncThunk<string>('a', () => {
      return 'noop'
    })
    const thunkB = createAsyncThunk<number>('b', () => {
      return 0
    })

    const action = thunkA.fulfilled('fakeRequestId', 'test')

    expect(isAnyOf(thunkA.fulfilled, thunkB.fulfilled)(action)).toEqual(true)

    expect(
      isAnyOf(thunkA.pending, thunkA.rejected, thunkB.fulfilled)(action)
    ).toEqual(false)
  })

  it('works with reducers', () => {
    const actionA = createAction<string>('a')
    const actionB = createAction<number>('b')

    const trueAction = {
      type: 'a',
      payload: 'payload'
    }

    const initialState = { value: false }

    const reducer = createReducer(initialState, builder => {
      builder.addMatcher(isAnyOf(actionA, actionB), state => {
        return { ...state, value: true }
      })
    })

    expect(reducer(initialState, trueAction)).toEqual({ value: true })

    const falseAction = {
      type: 'c',
      payload: 'payload'
    }

    expect(reducer(initialState, falseAction)).toEqual(initialState)
  })
})
