import { createEntityAdapter, createSlice } from '../..'
import type {
  PayloadAction,
  SliceCaseReducers,
  UnknownAction,
  ValidateSliceCaseReducers,
} from '../..'
import type { EntityId, EntityState, IdSelector } from '../models'
import type { BookModel } from './fixtures/book'

describe('Entity Slice Enhancer', () => {
  let slice: ReturnType<typeof entitySliceEnhancer<BookModel, string>>

  beforeEach(() => {
    slice = entitySliceEnhancer({
      name: 'book',
      selectId: (book: BookModel) => book.id,
    })
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

interface EntitySliceArgs<
  T,
  Id extends EntityId,
  CaseReducers extends SliceCaseReducers<EntityState<T, Id>>,
> {
  name: string
  selectId: IdSelector<T, Id>
  modelReducer?: ValidateSliceCaseReducers<EntityState<T, Id>, CaseReducers>
}

function entitySliceEnhancer<
  T,
  Id extends EntityId,
  CaseReducers extends SliceCaseReducers<EntityState<T, Id>> = {},
>({ name, selectId, modelReducer }: EntitySliceArgs<T, Id, CaseReducers>) {
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
