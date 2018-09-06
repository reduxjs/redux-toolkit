import createSlice from './createSlice'

describe('createSlice', () => {
  describe('when slice is empty', () => {
    const { actions, reducer } = createSlice({
      actions: {
        increment: state => state + 1,
        multiply: (state, action) => state * action.payload
      },
      initialState: 0
    })

    it('should create increment action', () => {
      expect(actions.hasOwnProperty('increment')).toBe(true)
    })

    it('should create multiply action', () => {
      expect(actions.hasOwnProperty('multiply')).toBe(true)
    })

    it('should have the correct action for increment', () => {
      expect(actions.increment()).toEqual({
        type: 'increment',
        payload: undefined
      })
    })

    it('should have the correct action for multiply', () => {
      expect(actions.multiply(3)).toEqual({
        type: 'multiply',
        payload: 3
      })
    })

    describe('when using reducer', () => {
      it('should return the correct value from reducer with increment', () => {
        expect(reducer(undefined, actions.increment())).toEqual(1)
      })

      it('should return the correct value from reducer with multiply', () => {
        expect(reducer(2, actions.multiply(3))).toEqual(6)
      })
    })
  })

  describe('when passing slice', () => {
    const { actions, reducer } = createSlice({
      actions: {
        increment: state => state + 1
      },
      initialState: 0,
      slice: 'cool'
    })

    it('should create increment action', () => {
      expect(actions.hasOwnProperty('increment')).toBe(true)
    })

    it('should have the correct action for increment', () => {
      expect(actions.increment()).toEqual({
        type: 'cool/increment',
        payload: undefined
      })
    })

    it('should return the correct value from reducer', () => {
      expect(reducer(undefined, actions.increment())).toEqual(1)
    })
  })
})
