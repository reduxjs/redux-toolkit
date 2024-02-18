import {
  buildCreateSlice,
  createEntityAdapter,
  createSlice,
  entityMethodsCreator,
  createEntityMethods,
} from '@reduxjs/toolkit'
import type {
  PayloadAction,
  Slice,
  SliceCaseReducers,
  UnknownAction,
} from '../..'
import type { EntityId, EntityState, IdSelector } from '../models'
import type { BookModel } from './fixtures/book'

describe('Entity Slice Enhancer', () => {
  let slice: Slice<EntityState<BookModel, BookModel['id']>>

  beforeEach(() => {
    const indieSlice = entitySliceEnhancer({
      name: 'book',
      selectId: (book: BookModel) => book.id,
    })
    slice = indieSlice
  })

  it('exposes oneAdded', () => {
    const book = {
      id: '0',
      title: 'Der Steppenwolf',
      author: 'Herman Hesse',
    }
    const action = slice.actions.oneAdded(book)
    const oneAdded = slice.reducer(undefined, action as UnknownAction)
    expect(oneAdded.entities['0']).toBe(book)
  })
})

interface EntitySliceArgs<T, Id extends EntityId> {
  name: string
  selectId: IdSelector<T, Id>
  modelReducer?: SliceCaseReducers<T>
}

function entitySliceEnhancer<T, Id extends EntityId>({
  name,
  selectId,
  modelReducer,
}: EntitySliceArgs<T, Id>) {
  const modelAdapter = createEntityAdapter({
    selectId,
  })

  return createSlice({
    name,
    initialState: modelAdapter.getInitialState(),
    reducers: {
      oneAdded(state, action: PayloadAction<T>) {
        modelAdapter.addOne(state, action.payload)
      },
      ...modelReducer,
    },
  })
}

describe('entity slice creator', () => {
  const createAppSlice = buildCreateSlice({
    creators: { entityMethods: entityMethodsCreator },
  })

  const bookAdapter = createEntityAdapter<BookModel>()

  const bookSlice = createAppSlice({
    name: 'book',
    initialState: bookAdapter.getInitialState({
      nested: bookAdapter.getInitialState(),
    }),
    reducers: (create) => ({
      ...create.entityMethods(bookAdapter, {
        name: 'book',
      }),
      ...create.entityMethods(bookAdapter, {
        selectEntityState: (state) => state.nested,
        name: 'nestedBook',
        pluralName: 'nestedBookies',
      }),
    }),
  })

  it('should generate correct actions', () => {
    expect(bookSlice.actions.addOneBook).toBeTypeOf('function')
    expect(bookSlice.actions.addOneNestedBook).toBeTypeOf('function')
    expect(bookSlice.actions.addManyBooks).toBeTypeOf('function')
    expect(bookSlice.actions.addManyNestedBookies).toBeTypeOf('function')
  })
  it('should handle actions', () => {
    const withBook = bookSlice.reducer(
      undefined,
      bookSlice.actions.addOneBook(AClockworkOrange),
    )
    expect(
      bookAdapter.getSelectors().selectById(withBook, AClockworkOrange.id),
    ).toBe(AClockworkOrange)

    const withNestedBook = bookSlice.reducer(
      withBook,
      bookSlice.actions.addOneNestedBook(AClockworkOrange),
    )
    expect(
      bookAdapter
        .getSelectors(
          (state: ReturnType<typeof bookSlice.reducer>) => state.nested,
        )
        .selectById(withNestedBook, AClockworkOrange.id),
    ).toBe(AClockworkOrange)
  })
  it('should be able to be called without this context', () => {
    const bookSlice = createAppSlice({
      name: 'book',
      initialState: bookAdapter.getInitialState(),
      reducers: ({ entityMethods }) => ({
        ...entityMethods(bookAdapter),
      }),
    })
    expect(bookSlice.actions.addOne).toBeTypeOf('function')
  })
  it('can be called with object syntax', () => {
    const bookSlice = createAppSlice({
      name: 'book',
      initialState: bookAdapter.getInitialState(),
      reducers: {
        ...createEntityMethods(bookAdapter, {
          name: 'book',
        }),
      },
    })
    expect(bookSlice.actions.addOneBook).toBeTypeOf('function')

    const initialState = { nested: bookAdapter.getInitialState() }
    const nestedBookSlice = createAppSlice({
      name: 'book',
      initialState,
      reducers: {
        ...createEntityMethods(bookAdapter, {
          // state can't be inferred, so needs to be annotated
          selectEntityState: (state: typeof initialState) => state.nested,
          name: 'nestedBook',
          pluralName: 'nestedBookies',
        }),
      },
    })
    expect(nestedBookSlice.actions.addOneNestedBook).toBeTypeOf('function')
  })
})
