import { checkDirectory } from 'typings-tester'

test('Types', () => {
  checkDirectory(`${__dirname}/files`)
})
