import { createEntityAdapter, EntityAdapter } from './index'
import { BookModel } from './fixtures/book'

describe('Entity State', () => {
  let adapter: EntityAdapter<BookModel>

  beforeEach(() => {
    adapter = createEntityAdapter({
      selectId: (book: BookModel) => book.id
    })
  })

  it('should let you get the initial state', () => {
    const initialState = adapter.getInitialState()

    expect(initialState).toEqual({
      ids: [],
      entities: {}
    })
  })

  it('should let you provide additional initial state properties', () => {
    const additionalProperties = { isHydrated: true }

    const initialState = adapter.getInitialState(additionalProperties)

    expect(initialState).toEqual({
      ...additionalProperties,
      ids: [],
      entities: {}
    })
  })
})
