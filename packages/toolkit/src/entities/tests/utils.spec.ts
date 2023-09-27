import { vi } from 'vitest'
import { AClockworkOrange } from './fixtures/book'

describe('Entity utils', () => {
  describe(`selectIdValue()`, () => {
    const OLD_ENV = process.env

    beforeEach(() => {
      vi.resetModules() // this is important - it clears the cache
      process.env = { ...OLD_ENV, NODE_ENV: 'development' }
    })

    afterEach(() => {
      process.env = OLD_ENV
      vi.resetAllMocks()
    })

    it('should not warn when key does exist', async () => {
      const { selectIdValue } = await import('../utils')
      const spy = vi.spyOn(console, 'warn')

      selectIdValue(AClockworkOrange, (book: any) => book.id)
      expect(spy).not.toHaveBeenCalled()
    })

    it('should warn when key does not exist in dev mode', async () => {
      const { selectIdValue } = await import('../utils')
      const spy = vi.spyOn(console, 'warn')

      selectIdValue(AClockworkOrange, (book: any) => book.foo)

      expect(spy).toHaveBeenCalled()
    })

    it('should warn when key is undefined in dev mode', async () => {
      const { selectIdValue } = await import('../utils')
      const spy = vi.spyOn(console, 'warn')

      const undefinedAClockworkOrange = { ...AClockworkOrange, id: undefined }
      selectIdValue(undefinedAClockworkOrange, (book: any) => book.id)

      expect(spy).toHaveBeenCalled()
    })

    it('should not warn when key does not exist in prod mode', async () => {
      process.env.NODE_ENV = 'production'
      const { selectIdValue } = await import('../utils')
      const spy = vi.spyOn(console, 'warn')

      selectIdValue(AClockworkOrange, (book: any) => book.foo)

      expect(spy).not.toHaveBeenCalled()
    })

    it('should not warn when key is undefined in prod mode', async () => {
      process.env.NODE_ENV = 'production'
      const { selectIdValue } = await import('../utils')
      const spy = vi.spyOn(console, 'warn')

      const undefinedAClockworkOrange = { ...AClockworkOrange, id: undefined }
      selectIdValue(undefinedAClockworkOrange, (book: any) => book.id)

      expect(spy).not.toHaveBeenCalled()
    })
  })
})
