import identity from './identity'

describe('identity', () => {
  it('return the exact passed value', () => {
    expect(identity(false)).toBe(false)
    expect(identity(true)).toBe(true)
    expect(identity()).toBeUndefined()
    expect(identity('A_VALUE')).toBe('A_VALUE')

    const object = {}
    expect(identity(object)).toBe(object)
  })
})
