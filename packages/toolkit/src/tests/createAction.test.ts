import { createAction, isActionCreator } from '@reduxjs/toolkit'

describe('createAction', () => {
  it('should create an action', () => {
    const actionCreator = createAction<string>('A_TYPE')
    expect(actionCreator('something')).toEqual({
      type: 'A_TYPE',
      payload: 'something',
    })
  })

  describe('when stringifying action', () => {
    it('should return the action type', () => {
      const actionCreator = createAction('A_TYPE')
      expect(`${actionCreator}`).toEqual('A_TYPE')
    })
  })

  describe('when passing a prepareAction method only returning a payload', () => {
    it('should use the payload returned from the prepareAction method', () => {
      const actionCreator = createAction('A_TYPE', (a: number) => ({
        payload: a * 2,
      }))
      expect(actionCreator(5).payload).toBe(10)
    })
    it('should not have a meta attribute on the resulting Action', () => {
      const actionCreator = createAction('A_TYPE', (a: number) => ({
        payload: a * 2,
      }))
      expect('meta' in actionCreator(5)).toBeFalsy()
    })
  })

  describe('when passing a prepareAction method returning a payload and meta', () => {
    it('should use the payload returned from the prepareAction method', () => {
      const actionCreator = createAction('A_TYPE', (a: number) => ({
        payload: a * 2,
        meta: a / 2,
      }))
      expect(actionCreator(5).payload).toBe(10)
    })
    it('should use the meta returned from the prepareAction method', () => {
      const actionCreator = createAction('A_TYPE', (a: number) => ({
        payload: a * 2,
        meta: a / 2,
      }))
      expect(actionCreator(10).meta).toBe(5)
    })
  })

  describe('when passing a prepareAction method returning a payload and error', () => {
    it('should use the payload returned from the prepareAction method', () => {
      const actionCreator = createAction('A_TYPE', (a: number) => ({
        payload: a * 2,
        error: true,
      }))
      expect(actionCreator(5).payload).toBe(10)
    })
    it('should use the error returned from the prepareAction method', () => {
      const actionCreator = createAction('A_TYPE', (a: number) => ({
        payload: a * 2,
        error: true,
      }))
      expect(actionCreator(10).error).toBe(true)
    })
  })

  describe('when passing a prepareAction method returning a payload, meta and error', () => {
    it('should use the payload returned from the prepareAction method', () => {
      const actionCreator = createAction('A_TYPE', (a: number) => ({
        payload: a * 2,
        meta: a / 2,
        error: true,
      }))
      expect(actionCreator(5).payload).toBe(10)
    })
    it('should use the error returned from the prepareAction method', () => {
      const actionCreator = createAction('A_TYPE', (a: number) => ({
        payload: a * 2,
        meta: a / 2,
        error: true,
      }))
      expect(actionCreator(10).error).toBe(true)
    })
    it('should use the meta returned from the prepareAction method', () => {
      const actionCreator = createAction('A_TYPE', (a: number) => ({
        payload: a * 2,
        meta: a / 2,
        error: true,
      }))
      expect(actionCreator(10).meta).toBe(5)
    })
  })

  describe('when passing a prepareAction that accepts multiple arguments', () => {
    it('should pass all arguments of the resulting actionCreator to prepareAction', () => {
      const actionCreator = createAction(
        'A_TYPE',
        (a: string, b: string, c: string) => ({
          payload: a + b + c,
        }),
      )
      expect(actionCreator('1', '2', '3').payload).toBe('123')
    })
  })

  describe('actionCreator.match', () => {
    test('should return true for actions generated by own actionCreator', () => {
      const actionCreator = createAction('test')
      expect(actionCreator.match(actionCreator())).toBe(true)
    })

    test('should return true for matching actions', () => {
      const actionCreator = createAction('test')
      expect(actionCreator.match({ type: 'test' })).toBe(true)
    })

    test('should return false for other actions', () => {
      const actionCreator = createAction('test')
      expect(actionCreator.match({ type: 'test-abc' })).toBe(false)
    })
  })
})

const actionCreator = createAction('anAction')

class Action {
  type = 'totally an action'
}

describe('isActionCreator', () => {
  it('should only return true for action creators', () => {
    expect(isActionCreator(actionCreator)).toBe(true)
    const notActionCreators = [
      { type: 'an action' },
      { type: 'more props', extra: true },
      actionCreator(),
      Promise.resolve({ type: 'an action' }),
      new Action(),
      false,
      'a string',
      false,
    ]
    for (const notActionCreator of notActionCreators) {
      expect(isActionCreator(notActionCreator)).toBe(false)
    }
  })
})
