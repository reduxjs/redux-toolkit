import { testIf, checkDirectory, tsVersion } from './lib'

testIf(tsVersion >= 3.4)('Types >= 3.4', () => {
  checkDirectory(`${__dirname}/files/min-3.4`)
})
