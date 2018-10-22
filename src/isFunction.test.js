import isFunction from './isFunction'

describe('isFunction', () => {
  it('returns true only if function', () => {
    function Test() {}

    expect(isFunction(Test)).toBe(true)
    expect(isFunction(new Test())).toBe(false)
    expect(isFunction(new Date())).toBe(false)
    expect(isFunction([1, 2, 3])).toBe(false)
    expect(isFunction(null)).toBe(false)
    expect(isFunction()).toBe(false)
    expect(isFunction({ x: 1, y: 2 })).toBe(false)
  })
})
