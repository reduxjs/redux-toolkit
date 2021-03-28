import { createEntityAdapter, EntityAdapter } from './index'
import { PayloadAction, createAction } from '../createAction'
import { createSlice } from '../createSlice'
import { BookModel } from './fixtures/book'

describe('Entity State', () => {
  let adapter: EntityAdapter<BookModel>

  const adapter2 = createEntityAdapter<BookModel, 'id'>({
    selectId: (book: BookModel) => book.id,
    indices: {
      // TODO These should be BookModel, not unknown
      id: (a, b) => a.id.localeCompare(b.id)
    }
  })

  const tempState = adapter2.getInitialState()
  // TODO should be an empty array
  console.log(tempState.indices.id)

  {
    // selectors nested:
    const selectors = adapter2.getSelectors()
    selectors.indices.id.selectAll(tempState)
    selectors.indices.id.selectIds(tempState)

    // @ts-expect-error
    selectors.indices.somethingElse
  }

  beforeEach(() => {
    adapter = createEntityAdapter({
      selectId: (book: BookModel) => book.id
    })
  })

  it('should let you get the initial state', () => {
    const initialState = adapter.getInitialState()

    expect(initialState).toEqual({
      ids: [],
      entities: {},
      indices: {}
    })
  })

  it('should let you provide additional initial state properties', () => {
    const additionalProperties = { isHydrated: true }

    const initialState = adapter.getInitialState(additionalProperties)

    expect(initialState).toEqual({
      ...additionalProperties,
      ids: [],
      entities: {},
      indices: {}
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
          // TODO The nested `produce` calls don't mutate `state` here as I would have expected.
          // TODO (note that `state` here is actually an Immer Draft<S>, from `createReducer`)
          // TODO However, this works if we _return_ the new plain result value instead
          // TODO See https://github.com/immerjs/immer/issues/533
          const result = adapter.removeOne(state, action)
          return result
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

describe('inferred usage of entityState', () => {
  function expectType<T>(_: T) {}

  const adapter1 = createEntityAdapter({
    selectId: (book: BookModel) => book.id,
    indices: {
      id: (a, b) => a.id.localeCompare(b.id)
    }
  })
  expectType<EntityAdapter<BookModel, 'id'>>(adapter1)

  const adapter2 = createEntityAdapter({
    indices: {
      id: (a: BookModel, b) => a.id.localeCompare(b.id)
    }
  })
  expectType<EntityAdapter<BookModel, 'id'>>(adapter2)

  const tempState = adapter1.getInitialState()
  // TODO should be an empty array
  console.log(tempState.indices.id)

  {
    // selectors nested:
    const selectors = adapter1.getSelectors()
    selectors.indices.id.selectAll(tempState)
    selectors.indices.id.selectIds(tempState)

    // @ts-expect-error
    selectors.indices.somethingElse
  }
})
