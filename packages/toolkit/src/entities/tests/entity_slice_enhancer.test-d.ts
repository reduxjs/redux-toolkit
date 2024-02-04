import type { PayloadActionCreator } from '../../createAction'
import {
  buildCreateSlice,
  createEntityAdapter,
  entityMethodsCreator,
} from '@reduxjs/toolkit'
import type { BookModel } from './fixtures/book'

describe('entity slice creator', () => {
  const createAppSlice = buildCreateSlice({
    creators: { entityMethods: entityMethodsCreator },
  })
  it('should require selectEntityState if state is not compatible', () => {
    const bookAdapter = createEntityAdapter<BookModel>()
    const bookSlice = createAppSlice({
      name: 'books',
      initialState: { data: bookAdapter.getInitialState() },
      reducers: (create) => ({
        // @ts-expect-error
        ...create.entityMethods(bookAdapter),
        // @ts-expect-error
        ...create.entityMethods(bookAdapter, {}),
        ...create.entityMethods(bookAdapter, {
          selectEntityState: (state) => state.data,
        }),
      }),
    })
    expectTypeOf(bookSlice.actions.addOne).toEqualTypeOf<
      PayloadActionCreator<BookModel, 'books/addOne'>
    >()
  })
  it('can be used in object form, and shows error if incompatible', () => {
    const bookAdapter = createEntityAdapter<BookModel>()

    const initialState = { data: bookAdapter.getInitialState() }

    const bookSlice = createAppSlice({
      name: 'books',
      initialState: { data: bookAdapter.getInitialState() },
      // @ts-expect-error
      reducers: {
        ...entityMethodsCreator.create(bookAdapter),
      },
    })

    const bookSlice2 = createAppSlice({
      name: 'books',
      initialState,
      reducers: {
        ...entityMethodsCreator.create(bookAdapter, {
          // cannot be inferred, needs annotation
          selectEntityState: (state: typeof initialState) => state.data,
        }),
      },
    })

    expectTypeOf(bookSlice2.actions.addOne).toEqualTypeOf<
      PayloadActionCreator<BookModel, 'books/addOne'>
    >()

    const bookSlice3 = createAppSlice({
      name: 'books',
      initialState: bookAdapter.getInitialState(),
      reducers: {
        ...entityMethodsCreator.create(bookAdapter),
      },
    })

    expectTypeOf(bookSlice3.actions.addOne).toEqualTypeOf<
      PayloadActionCreator<BookModel, 'books/addOne'>
    >()
  })
})
