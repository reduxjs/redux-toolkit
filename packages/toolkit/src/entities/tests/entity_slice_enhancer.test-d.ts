import type { PayloadActionCreator } from '../../createAction'
import { buildCreateSlice } from '../../createSlice'
import { createEntityAdapter } from '../create_adapter'
import { entityMethodsCreator } from '../slice_creator'
import type { BookModel } from './fixtures/book'

describe('Entity Slice Enhancer', () => {
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
})
