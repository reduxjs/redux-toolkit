import { getDefaultMiddleware } from './getDefaultMiddleware'
import thunk from 'redux-thunk'

describe('getDefaultMiddleware', () => {
  const ORIGINAL_NODE_ENV = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV
  })

  it('returns an array with only redux-thunk in production', () => {
    process.env.NODE_ENV = 'production'

    expect(getDefaultMiddleware()).toEqual([thunk])
  })

  it('returns an array with additional middleware in development', () => {
    const middleware = getDefaultMiddleware()
    expect(middleware).toContain(thunk)
    expect(middleware.length).toBeGreaterThan(1)
  })
})
