import type { EntityAdapter } from '@reduxjs/toolkit'
import { createEntityAdapter } from '@reduxjs/toolkit'
import type { BookModel } from './fixtures/book'
import { AnimalFarm } from './fixtures/book'

const prototypeKeys = ['toString', 'constructor', 'hasOwnProperty', 'valueOf']

describe.each([
  ['unsorted', () => createEntityAdapter<BookModel>()],
  [
    'sorted',
    () =>
      createEntityAdapter<BookModel>({
        sortComparer: (a, b) => a.title.localeCompare(b.title),
      }),
  ],
])('%s adapter with Object.prototype keys as ids', (_, createAdapter) => {
  let adapter: EntityAdapter<BookModel, string>

  beforeEach(() => {
    adapter = createAdapter()
  })

  it.each(prototypeKeys)('selectById returns undefined for %s', (id) => {
    const { selectById } = adapter.getSelectors()
    const state = adapter.setAll(adapter.getInitialState(), [AnimalFarm])

    expect(selectById(state, id)).toBeUndefined()
  })

  it.each(prototypeKeys)('selectByIds skips %s', (id) => {
    const { selectByIds } = adapter.getSelectors()
    const state = adapter.setAll(adapter.getInitialState(), [AnimalFarm])

    expect(selectByIds(state, [id, AnimalFarm.id])).toEqual([AnimalFarm])
  })

  it.each(prototypeKeys)('globalized selectById returns undefined for %s', (id) => {
    const { selectById } = adapter.getSelectors(
      (state: { books: ReturnType<typeof adapter.getInitialState> }) =>
        state.books,
    )
    const books = adapter.setAll(adapter.getInitialState(), [AnimalFarm])

    expect(selectById({ books }, id)).toBeUndefined()
  })

  it.each(prototypeKeys)('addOne adds an entity with id %s', (id) => {
    const book = { id, title: 'Prototype' }
    const state = adapter.addOne(adapter.getInitialState(), book)

    expect(state.ids).toEqual([id])
    expect(state.entities[id]).toBe(book)
  })

  it.each(prototypeKeys)('setOne adds an entity with id %s', (id) => {
    const book = { id, title: 'Prototype' }
    const state = adapter.setOne(adapter.getInitialState(), book)

    expect(state.ids).toEqual([id])
    expect(state.entities[id]).toBe(book)
  })

  it.each(prototypeKeys)('upsertOne adds an entity with id %s', (id) => {
    const book = { id, title: 'Prototype' }
    const state = adapter.upsertOne(adapter.getInitialState(), book)

    expect(state.ids).toEqual([id])
    expect(state.entities[id]).toEqual(book)
  })

  it.each(prototypeKeys)('updateOne ignores a missing %s entity', (id) => {
    const initial = adapter.setAll(adapter.getInitialState(), [AnimalFarm])
    const state = adapter.updateOne(initial, {
      id,
      changes: { title: 'Changed' },
    })

    expect(state).toBe(initial)
  })

  it.each(prototypeKeys)('removeOne ignores a missing %s entity', (id) => {
    const initial = adapter.setAll(adapter.getInitialState(), [AnimalFarm])
    const state = adapter.removeOne(initial, id)

    expect(state).toBe(initial)
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, id)).toBe(
      true,
    )
  })
})

describe('unsorted adapter with the id __proto__', () => {
  it.each(['addOne', 'setOne', 'upsertOne'] as const)(
    '%s ignores the entity',
    (method) => {
      const adapter = createEntityAdapter<BookModel>()
      const book = { id: '__proto__', title: 'Prototype' }
      const initial = adapter.setAll(adapter.getInitialState(), [AnimalFarm])
      const state = adapter[method](adapter[method](initial, book), book)

      expect(state.ids).toEqual([AnimalFarm.id])
      expect(Object.getPrototypeOf(state.entities)).toBe(Object.prototype)
      expect(adapter.getSelectors().selectById(state, '__proto__')).toBe(
        undefined,
      )
    },
  )
})
