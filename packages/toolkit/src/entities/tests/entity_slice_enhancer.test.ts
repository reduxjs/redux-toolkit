import { createEntityAdapter, createSlice } from '../..'
import type { PayloadAction, SliceCaseReducers, UnknownAction } from '../..'
import type { EntityId, IdSelector } from '../models'
import type { BookModel } from './fixtures/book'

describe('Entity Slice Enhancer', () => {
  let slice: ReturnType<typeof entitySliceEnhancer<BookModel, string>>

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
