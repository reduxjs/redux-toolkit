import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import {
  onFocus,
  onFocusLost,
  onOffline,
  onOnline,
} from '@internal/query/core/setupListeners'

function createDispatch() {
  return vi.fn<ThunkDispatch<unknown, unknown, UnknownAction>>()
}

function typesOf(dispatch: ReturnType<typeof createDispatch>) {
  return dispatch.mock.calls.map(([action]) => (action as UnknownAction).type)
}

describe('setupListeners', () => {
  test('every registered dispatch receives window events', () => {
    const first = createDispatch()
    const second = createDispatch()
    const unsubscribeFirst = setupListeners(first)
    const unsubscribeSecond = setupListeners(second)

    window.dispatchEvent(new Event('focus'))
    window.dispatchEvent(new Event('online'))
    window.dispatchEvent(new Event('offline'))

    const expected = [onFocus.type, onOnline.type, onOffline.type]
    expect(typesOf(first)).toEqual(expected)
    expect(typesOf(second)).toEqual(expected)

    unsubscribeFirst()
    unsubscribeSecond()
  })

  test('visibilitychange dispatches onFocus or onFocusLost', () => {
    const dispatch = createDispatch()
    const unsubscribe = setupListeners(dispatch)

    const visibility = vi.spyOn(document, 'visibilityState', 'get')
    visibility.mockReturnValue('hidden')
    document.dispatchEvent(new Event('visibilitychange', { bubbles: true }))
    visibility.mockReturnValue('visible')
    document.dispatchEvent(new Event('visibilitychange', { bubbles: true }))
    visibility.mockRestore()

    expect(typesOf(dispatch)).toEqual([onFocusLost.type, onFocus.type])

    unsubscribe()
  })

  test('unsubscribing one store leaves the other subscribed', () => {
    const first = createDispatch()
    const second = createDispatch()
    const unsubscribeFirst = setupListeners(first)
    const unsubscribeSecond = setupListeners(second)

    unsubscribeFirst()
    window.dispatchEvent(new Event('focus'))

    expect(typesOf(first)).toEqual([])
    expect(typesOf(second)).toEqual([onFocus.type])

    unsubscribeSecond()
    window.dispatchEvent(new Event('focus'))

    expect(typesOf(second)).toEqual([onFocus.type])
  })

  test('two calls for one dispatch need two unsubscribes, and dispatch once per event', () => {
    const dispatch = createDispatch()
    const unsubscribeA = setupListeners(dispatch)
    const unsubscribeB = setupListeners(dispatch)

    window.dispatchEvent(new Event('focus'))
    expect(typesOf(dispatch)).toEqual([onFocus.type])

    unsubscribeA()
    unsubscribeA()
    window.dispatchEvent(new Event('focus'))
    expect(typesOf(dispatch)).toEqual([onFocus.type, onFocus.type])

    unsubscribeB()
    window.dispatchEvent(new Event('focus'))
    expect(typesOf(dispatch)).toEqual([onFocus.type, onFocus.type])
  })

  test('removes the window listeners after the last unsubscribe', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')

    const unsubscribeFirst = setupListeners(createDispatch())
    const unsubscribeSecond = setupListeners(createDispatch())
    expect(addSpy).toHaveBeenCalledTimes(4)

    unsubscribeFirst()
    expect(removeSpy).not.toHaveBeenCalled()

    unsubscribeSecond()
    expect(removeSpy).toHaveBeenCalledTimes(4)

    addSpy.mockRestore()
    removeSpy.mockRestore()
  })

  test('custom handlers still receive dispatch and the actions', () => {
    const dispatch = createDispatch()
    const cleanup = vi.fn()
    const handler = vi.fn<NonNullable<Parameters<typeof setupListeners>[1]>>(
      () => cleanup,
    )

    const result = setupListeners(dispatch, handler)

    expect(handler).toHaveBeenCalledOnce()
    const [receivedDispatch, actions] = handler.mock.calls[0]
    expect(receivedDispatch).toBe(dispatch)
    expect(actions.onFocus.type).toBe(onFocus.type)
    expect(actions.onFocusLost.type).toBe(onFocusLost.type)
    expect(actions.onOnline.type).toBe(onOnline.type)
    expect(actions.onOffline.type).toBe(onOffline.type)
    expect(result).toBe(cleanup)
  })
})
