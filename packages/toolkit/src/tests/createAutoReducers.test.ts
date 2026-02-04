import { createAutoReducers } from '../createAutoReducers'

describe('createAutoReducers', () => {
  it('should generate reducers from object initialState', () => {
    const initialState = {
      count: 0,
      name: '',
      active: false,
    }

    const reducers = createAutoReducers(initialState)

    expect(reducers).toHaveProperty('setCount')
    expect(reducers).toHaveProperty('setName')
    expect(reducers).toHaveProperty('setActive')

    expect(typeof reducers.setCount).toBe('function')
    expect(typeof reducers.setName).toBe('function')
    expect(typeof reducers.setActive).toBe('function')

    expect(Object.keys(reducers)).toHaveLength(3)
  })

  it('should generate reducers from function initialState', () => {
    const initialStateFactory = () => ({
      count: 0,
      name: '',
      active: false,
    })

    const reducers = createAutoReducers(initialStateFactory)

    expect(reducers).toHaveProperty('setCount')
    expect(reducers).toHaveProperty('setName')
    expect(reducers).toHaveProperty('setActive')
    expect(Object.keys(reducers)).toHaveLength(3)
  })

  it('should update state correctly for each reducer', () => {
    const initialState = {
      count: 0,
      name: '',
      active: false,
    }

    const reducers = createAutoReducers(initialState)

    const state1 = { ...initialState }
    reducers.setCount(state1, { payload: 42, type: 'test/setCount' })
    expect(state1.count).toBe(42)
    expect(state1.name).toBe('')
    expect(state1.active).toBe(false)

    const state2 = { ...initialState }
    reducers.setName(state2, { payload: 'John', type: 'test/setName' })
    expect(state2.count).toBe(0)
    expect(state2.name).toBe('John')
    expect(state2.active).toBe(false)

    const state3 = { ...initialState }
    reducers.setActive(state3, { payload: true, type: 'test/setActive' })
    expect(state3.count).toBe(0)
    expect(state3.name).toBe('')
    expect(state3.active).toBe(true)
  })

  it('should handle complex state types', () => {
    const initialState = {
      user: { id: 1, name: 'Alice' },
      items: ['item1', 'item2'],
      metadata: { version: 1.0 },
    }

    const reducers = createAutoReducers(initialState)

    expect(reducers).toHaveProperty('setUser')
    expect(reducers).toHaveProperty('setItems')
    expect(reducers).toHaveProperty('setMetadata')

    const state = { ...initialState }
    const newUser = { id: 2, name: 'Bob' }
    reducers.setUser(state, { payload: newUser, type: 'test/setUser' })
    expect(state.user).toEqual(newUser)
    expect(state.items).toEqual(['item1', 'item2'])
  })

  it('should generate correct reducer names with camelCase fields', () => {
    const initialState = {
      firstName: '',
      lastName: '',
      isActive: false,
      totalCount: 0,
    }

    const reducers = createAutoReducers(initialState)

    expect(reducers).toHaveProperty('setFirstName')
    expect(reducers).toHaveProperty('setLastName')
    expect(reducers).toHaveProperty('setIsActive')
    expect(reducers).toHaveProperty('setTotalCount')

    expect(reducers).not.toHaveProperty('setfirstname')
    expect(reducers).not.toHaveProperty('setFirstname')
  })

  it('should handle empty state object', () => {
    const initialState = {}
    const reducers = createAutoReducers(initialState)
    expect(reducers).toEqual({})
    expect(Object.keys(reducers)).toHaveLength(0)
  })

  it('should throw error for invalid initialState', () => {
    expect(() => {
      createAutoReducers(null)
    }).toThrow()

    expect(() => {
      createAutoReducers(undefined)
    }).toThrow()

    expect(() => {
      createAutoReducers(() => 'not an object')
    }).toThrow()
  })

  it('should maintain immutability pattern (direct mutation in reducer)', () => {
    const initialState = { count: 0 }
    const reducers = createAutoReducers(initialState)

    const state = { ...initialState }
    const originalState = { ...state }

    reducers.setCount(state, { payload: 5, type: 'test/setCount' })

    expect(state).not.toBe(originalState)
    expect(state.count).toBe(5)
  })
})
