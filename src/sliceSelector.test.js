import { createSelectorName } from './sliceSelector'

describe('createSelectorName', () => {
  it('should convert to camel case', () => {
    expect(createSelectorName('some')).toEqual('getSome')
    expect(createSelectorName('someThing')).toEqual('getSomeThing')
    expect(createSelectorName('some-thing')).toEqual('getSomeThing')
  })
})
