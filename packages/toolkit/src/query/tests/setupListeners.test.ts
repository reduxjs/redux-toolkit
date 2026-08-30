import { setupListeners } from '@reduxjs/toolkit/query'

describe('setupListeners', () => {
  test('a duplicate cleanup does not invalidate the active listener guard', () => {
    const addEventListener = vi.spyOn(window, 'addEventListener')
    const removeEventListener = vi.spyOn(window, 'removeEventListener')
    const firstCleanup = setupListeners(vi.fn() as any)
    const duplicateCleanup = setupListeners(vi.fn() as any)
    let thirdCleanup = () => {}

    try {
      expect(addEventListener).toHaveBeenCalledTimes(4)

      duplicateCleanup()
      thirdCleanup = setupListeners(vi.fn() as any)

      expect(addEventListener).toHaveBeenCalledTimes(4)
      expect(removeEventListener).not.toHaveBeenCalled()
    } finally {
      firstCleanup()
      duplicateCleanup()
      thirdCleanup()
    }
  })
})
