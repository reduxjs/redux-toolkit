import { createEntityAdapter, EntityAdapter } from './index'
import { PayloadAction, createAction } from '../createAction'
import { createSlice } from '../createSlice'
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

  it('should allow methods to be passed as reducers', () => {
    const upsertBook = createAction<BookModel>('otherBooks/upsert')

    const booksSlice = createSlice({
      name: 'books',
      initialState: adapter.getInitialState(),
      reducers: {
        addOne: adapter.addOne,
        removeOne(state, action: PayloadAction<string>) {
          return adapter.removeOne(state, action)
        }
      },
      extraReducers: builder => {
        builder.addCase(upsertBook, (state, action) => {
          return adapter.upsertOne(state, action)
        })
      }
    })

    const { addOne, removeOne } = booksSlice.actions
    const { reducer } = booksSlice

    const selectors = adapter.getSelectors()

    const book1: BookModel = { id: 'a', title: 'First' }
    const book1a: BookModel = { id: 'a', title: 'Second' }

    const afterAddOne = reducer(undefined, addOne(book1))
    expect(afterAddOne.entities[book1.id]).toBe(book1)

    const afterRemoveOne = reducer(afterAddOne, removeOne(book1.id))
    expect(afterRemoveOne.entities[book1.id]).toBeUndefined()
    expect(selectors.selectTotal(afterRemoveOne)).toBe(0)

    const afterUpsertFirst = reducer(afterRemoveOne, upsertBook(book1))
    const afterUpsertSecond = reducer(afterUpsertFirst, upsertBook(book1a))

    expect(afterUpsertSecond.entities[book1.id]).toEqual(book1a)
    expect(selectors.selectTotal(afterUpsertSecond)).toBe(1)
  })
})
