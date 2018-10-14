import { createAction, getType } from './createAction'

describe('createAction', () => {
  it('should create an action', () => {
    const action = createAction('A_TYPE')
    expect(action('something')).toEqual({
      type: 'A_TYPE',
      payload: 'something'
    })
  })

  describe('when stringifying action', () => {
    it('should return the action type', () => {
      const action = createAction('A_TYPE')
      expect(`${action}`).toEqual('A_TYPE')
    })
  })
})

describe('getType', () => {
  it('should return the action type', () => {
    const action = createAction('A_TYPE')
    expect(getType(action)).toEqual('A_TYPE')
  })
})
