import {
  isAllOf,
  isAnyOf,
  isAsyncThunkAction,
  isFulfilled,
  isPending,
  isRejected
} from './matchers'
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

describe('isAllOf', () => {
  it('returns true only if all matchers match', () => {
    const actionA = createAction<string>('a')

    interface SpecialAction {
      payload: 'SPECIAL'
    }

    const isActionSpecial = (action: any): action is SpecialAction => {
      return action.payload === 'SPECIAL'
    }

    const trueAction = {
      type: 'a',
      payload: 'SPECIAL'
    }

    expect(isAllOf(actionA, isActionSpecial)(trueAction)).toEqual(true)

    const falseAction = {
      type: 'a',
      payload: 'ORDINARY'
    }

    expect(isAllOf(actionA, isActionSpecial)(falseAction)).toEqual(false)

    const thunkA = createAsyncThunk<string>('a', () => 'result')

    const specialThunkAction = thunkA.fulfilled('SPECIAL', 'fakeRequestId')

    expect(isAllOf(thunkA.fulfilled, isActionSpecial)(specialThunkAction)).toBe(
      true
    )

    const ordinaryThunkAction = thunkA.fulfilled('ORDINARY', 'fakeRequestId')

    expect(
      isAllOf(thunkA.fulfilled, isActionSpecial)(ordinaryThunkAction)
    ).toBe(false)
  })
})

describe('isPending', () => {
  test('should return false for a regular action', () => {
    const action = createAction<string>('action/type')('testPayload')

    expect(isPending()(action)).toBe(false)
  })

  test('should return true only for pending async thunk actions', () => {
    const thunk = createAsyncThunk<string>('a', () => 'result')

    const pendingAction = thunk.pending('fakeRequestId')
    expect(isPending()(pendingAction)).toBe(true)

    const rejectedAction = thunk.rejected(
      new Error('rejected'),
      'fakeRequestId'
    )
    expect(isPending()(rejectedAction)).toBe(false)

    const fulfilledAction = thunk.fulfilled('result', 'fakeRequestId')
    expect(isPending()(fulfilledAction)).toBe(false)
  })

  test('should return true only for thunks provided as arguments', () => {
    const thunkA = createAsyncThunk<string>('a', () => 'result')
    const thunkB = createAsyncThunk<string>('b', () => 'result')
    const thunkC = createAsyncThunk<string>('c', () => 'result')

    const matchAC = isPending(thunkA, thunkC)

    function testPendingAction(
      thunk: typeof thunkA | typeof thunkB | typeof thunkC,
      expected: boolean
    ) {
      const pendingAction = thunk.pending('fakeRequestId')
      expect(matchAC(pendingAction)).toBe(expected)

      const rejectedAction = thunk.rejected(
        new Error('rejected'),
        'fakeRequestId'
      )
      expect(matchAC(rejectedAction)).toBe(false)

      const fulfilledAction = thunk.fulfilled('result', 'fakeRequestId')
      expect(matchAC(fulfilledAction)).toBe(false)
    }

    testPendingAction(thunkA, true)
    testPendingAction(thunkC, true)
    testPendingAction(thunkB, false)
  })
})

describe('isRejected', () => {
  test('should return false for a regular action', () => {
    const action = createAction<string>('action/type')('testPayload')

    expect(isRejected()(action)).toBe(false)
  })

  test('should return true only for rejected async thunk actions', () => {
    const thunk = createAsyncThunk<string>('a', () => 'result')

    const pendingAction = thunk.pending('fakeRequestId')
    expect(isRejected()(pendingAction)).toBe(false)

    const rejectedAction = thunk.rejected(
      new Error('rejected'),
      'fakeRequestId'
    )
    expect(isRejected()(rejectedAction)).toBe(true)

    const fulfilledAction = thunk.fulfilled('result', 'fakeRequestId')
    expect(isRejected()(fulfilledAction)).toBe(false)
  })

  test('should return true only for thunks provided as arguments', () => {
    const thunkA = createAsyncThunk<string>('a', () => 'result')
    const thunkB = createAsyncThunk<string>('b', () => 'result')
    const thunkC = createAsyncThunk<string>('c', () => 'result')

    const matchAC = isRejected(thunkA, thunkC)

    function testRejectedAction(
      thunk: typeof thunkA | typeof thunkB | typeof thunkC,
      expected: boolean
    ) {
      const pendingAction = thunk.pending('fakeRequestId')
      expect(matchAC(pendingAction)).toBe(false)

      const rejectedAction = thunk.rejected(
        new Error('rejected'),
        'fakeRequestId'
      )
      expect(matchAC(rejectedAction)).toBe(expected)

      const fulfilledAction = thunk.fulfilled('result', 'fakeRequestId')
      expect(matchAC(fulfilledAction)).toBe(false)
    }

    testRejectedAction(thunkA, true)
    testRejectedAction(thunkC, true)
    testRejectedAction(thunkB, false)
  })
})

describe('isFulfilled', () => {
  test('should return false for a regular action', () => {
    const action = createAction<string>('action/type')('testPayload')

    expect(isFulfilled()(action)).toBe(false)
  })

  test('should return true only for fulfilled async thunk actions', () => {
    const thunk = createAsyncThunk<string>('a', () => 'result')

    const pendingAction = thunk.pending('fakeRequestId')
    expect(isFulfilled()(pendingAction)).toBe(false)

    const rejectedAction = thunk.rejected(
      new Error('rejected'),
      'fakeRequestId'
    )
    expect(isFulfilled()(rejectedAction)).toBe(false)

    const fulfilledAction = thunk.fulfilled('result', 'fakeRequestId')
    expect(isFulfilled()(fulfilledAction)).toBe(true)
  })

  test('should return true only for thunks provided as arguments', () => {
    const thunkA = createAsyncThunk<string>('a', () => 'result')
    const thunkB = createAsyncThunk<string>('b', () => 'result')
    const thunkC = createAsyncThunk<string>('c', () => 'result')

    const matchAC = isFulfilled(thunkA, thunkC)

    function testFulfilledAction(
      thunk: typeof thunkA | typeof thunkB | typeof thunkC,
      expected: boolean
    ) {
      const pendingAction = thunk.pending('fakeRequestId')
      expect(matchAC(pendingAction)).toBe(false)

      const rejectedAction = thunk.rejected(
        new Error('rejected'),
        'fakeRequestId'
      )
      expect(matchAC(rejectedAction)).toBe(false)

      const fulfilledAction = thunk.fulfilled('result', 'fakeRequestId')
      expect(matchAC(fulfilledAction)).toBe(expected)
    }

    testFulfilledAction(thunkA, true)
    testFulfilledAction(thunkC, true)
    testFulfilledAction(thunkB, false)
  })
})

describe('isAsyncThunkAction', () => {
  test('should return false for a regular action', () => {
    const action = createAction<string>('action/type')('testPayload')

    expect(isAsyncThunkAction()(action)).toBe(false)
  })

  test('should return true for any async thunk action if no arguments were provided', () => {
    const thunk = createAsyncThunk<string>('a', () => 'result')
    const matcher = isAsyncThunkAction()

    const pendingAction = thunk.pending('fakeRequestId')
    expect(matcher(pendingAction)).toBe(true)

    const rejectedAction = thunk.rejected(
      new Error('rejected'),
      'fakeRequestId'
    )
    expect(matcher(rejectedAction)).toBe(true)

    const fulfilledAction = thunk.fulfilled('result', 'fakeRequestId')
    expect(matcher(fulfilledAction)).toBe(true)
  })

  test('should return true only for thunks provided as arguments', () => {
    const thunkA = createAsyncThunk<string>('a', () => 'result')
    const thunkB = createAsyncThunk<string>('b', () => 'result')
    const thunkC = createAsyncThunk<string>('c', () => 'result')

    const matchAC = isAsyncThunkAction(thunkA, thunkC)

    function testAllActions(
      thunk: typeof thunkA | typeof thunkB | typeof thunkC,
      expected: boolean
    ) {
      const pendingAction = thunk.pending('fakeRequestId')
      expect(matchAC(pendingAction)).toBe(expected)

      const rejectedAction = thunk.rejected(
        new Error('rejected'),
        'fakeRequestId'
      )
      expect(matchAC(rejectedAction)).toBe(expected)

      const fulfilledAction = thunk.fulfilled('result', 'fakeRequestId')
      expect(matchAC(fulfilledAction)).toBe(expected)
    }

    testAllActions(thunkA, true)
    testAllActions(thunkC, true)
    testAllActions(thunkB, false)
  })
})
