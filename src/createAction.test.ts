import { createAction, getType } from './createAction'

describe('createAction', () => {
  it('should create an action', () => {
    const actionCreator = createAction('A_TYPE')
    expect(actionCreator('something')).toEqual({
      type: 'A_TYPE',
      payload: 'something'
    })
  })

  describe('when stringifying action', () => {
    it('should return the action type', () => {
      const actionCreator = createAction('A_TYPE')
      expect(`${actionCreator}`).toEqual('A_TYPE')
    })
  })
})

describe('getType', () => {
  it('should return the action type', () => {
    const actionCreator = createAction('A_TYPE')
    expect(getType(actionCreator)).toEqual('A_TYPE')
  })
})
