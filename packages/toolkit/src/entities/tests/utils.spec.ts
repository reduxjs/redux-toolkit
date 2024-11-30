import { AClockworkOrange } from './fixtures/book'
import { consoleSpy, makeImportWithEnv } from '@internal/tests/utils/helpers'

describe('Entity utils', () => {
  describe(`selectIdValue()`, () => {
    const importWithEnv = makeImportWithEnv(() =>
      import('../utils').then((m) => m.selectIdValue),
    )

    using spy = consoleSpy('warn')

    afterEach(() => {
      spy.mockReset()
    })

    it('should not warn when key does exist', async () => {
      using selectIdValue = await importWithEnv('development')

      selectIdValue(AClockworkOrange, (book: any) => book.id)
      expect(spy).not.toHaveBeenCalled()
    })

    it('should warn when key does not exist in dev mode', async () => {
      using selectIdValue = await importWithEnv('development')

      selectIdValue(AClockworkOrange, (book: any) => book.foo)

      expect(spy).toHaveBeenCalled()
    })

    it('should warn when key is undefined in dev mode', async () => {
      using selectIdValue = await importWithEnv('development')

      const undefinedAClockworkOrange = { ...AClockworkOrange, id: undefined }
      selectIdValue(undefinedAClockworkOrange, (book: any) => book.id)

      expect(spy).toHaveBeenCalled()
    })

    it('should not warn when key does not exist in prod mode', async () => {
      using selectIdValue = await importWithEnv('production')

      selectIdValue(AClockworkOrange, (book: any) => book.foo)

      expect(spy).not.toHaveBeenCalled()
    })

    it('should not warn when key is undefined in prod mode', async () => {
      using selectIdValue = await importWithEnv('production')

      const undefinedAClockworkOrange = { ...AClockworkOrange, id: undefined }
      selectIdValue(undefinedAClockworkOrange, (book: any) => book.id)

      expect(spy).not.toHaveBeenCalled()
    })
  })
})
