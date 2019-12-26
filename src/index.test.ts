describe('Forces users to upgrade', () => {
  it('Throws an error on import', () => {
    const importRoot = () => require('./index')

    expect(importRoot).toThrow()
  })
})
