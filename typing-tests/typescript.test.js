import { checkDirectory } from 'typings-tester'

test('TypeScript definitions', () => {
  checkDirectory(`${__dirname}/typescript`)
})
