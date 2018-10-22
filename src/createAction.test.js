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

  describe('when passing no payloadCreator', () => {
    it('should return the plain value of the payload', () => {
      const action = createAction('A_TYPE')
      const payload = {
        value: 'A_VALUE'
      }
      expect(action(payload)).toEqual({
        type: 'A_TYPE',
        payload: {
          value: 'A_VALUE'
        }
      })
    })
  })
  describe('when passing a payloadCreator', () => {
    it('should return the transform the arguments into the correct payload', () => {
      const action = createAction('A_TYPE', (value1, value2) => ({
        value1,
        value2
      }))
      expect(action(true, false)).toEqual({
        type: 'A_TYPE',
        payload: {
          value1: true,
          value2: false
        }
      })

      expect(action(1)).toEqual({
        type: 'A_TYPE',
        payload: {
          value1: 1,
          value2: undefined
        }
      })
      expect(action('value', {})).toEqual({
        type: 'A_TYPE',
        payload: {
          value1: 'value',
          value2: {}
        }
      })
    })
    it('should use the identity payload if payloadCreator is not a function', () => {
      const action = createAction('A_TYPE', false)
      expect(action({}, false)).toEqual({
        type: 'A_TYPE',
        payload: {}
      })
    })
  })
})

describe('getType', () => {
  it('should return the action type', () => {
    const action = createAction('A_TYPE')
    expect(getType(action)).toEqual('A_TYPE')
  })
})
