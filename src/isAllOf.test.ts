import { isAllOf } from './isAllOf'
import { createAction } from './createAction'
import { createAsyncThunk } from './createAsyncThunk'

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
