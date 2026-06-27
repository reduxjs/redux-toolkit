import { createEntityAdapter } from '@reduxjs/toolkit'
import { describe, it, expect } from 'vitest'

// Regression test for: setAll with duplicate IDs should keep last occurrence
// (consistent with setMany behavior)
describe('createEntityAdapter: setAll with duplicate IDs', () => {
  it('setMany keeps LAST occurrence of duplicate ids (existing behavior)', () => {
    const adapter = createEntityAdapter<{ id: string; val: string }>()
    const state = adapter.getInitialState()

    const result = adapter.setMany(state, [
      { id: 'a', val: 'first' },
      { id: 'a', val: 'second' },
    ])

    expect(result.ids).toEqual(['a'])
    expect(result.entities['a']?.val).toBe('second') // last wins
  })

  it('setAll should keep LAST occurrence of duplicate ids (consistent with setMany)', () => {
    const adapter = createEntityAdapter<{ id: string; val: string }>()
    const state = adapter.getInitialState()

    const result = adapter.setAll(state, [
      { id: 'a', val: 'first' },
      { id: 'a', val: 'second' },
    ])

    expect(result.ids).toEqual(['a']) // no duplicate ids
    // BUG: currently returns 'first' (first wins), should return 'second' (last wins)
    expect(result.entities['a']?.val).toBe('second') // should be last wins
  })

  it('sorted adapter: setAll keeps LAST occurrence of duplicate ids', () => {
    const adapter = createEntityAdapter<{ id: string; title: string }>({
      sortComparer: (a, b) => a.title.localeCompare(b.title),
    })
    const state = adapter.getInitialState()

    const result = adapter.setAll(state, [
      { id: 'a', title: 'First' },
      { id: 'a', title: 'Second' },
    ])

    expect(result.ids).toEqual(['a']) // no duplicate ids
    // BUG: currently returns 'First' (first wins), should return 'Second' (last wins)
    expect(result.entities['a']?.title).toBe('Second')
  })
})
