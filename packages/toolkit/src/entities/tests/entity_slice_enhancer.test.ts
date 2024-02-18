import { createEntityAdapter, createSlice } from '@reduxjs/toolkit'
import type {
  PayloadAction,
  SliceCaseReducers,
  ValidateSliceCaseReducers,
} from '../..'
import type { EntityId, EntityState, IdSelector } from '../models'
import { AClockworkOrange, type BookModel } from './fixtures/book'

describe('Entity Slice Enhancer', () => {
  let slice: ReturnType<typeof entitySliceEnhancer<BookModel, string>>

  beforeEach(() => {
    slice = entitySliceEnhancer({
      name: 'book',
      selectId: (book: BookModel) => book.id,
    })
  })

  it('exposes oneAdded', () => {
    const action = slice.actions.oneAdded(AClockworkOrange)
    const oneAdded = slice.reducer(undefined, action)
    expect(oneAdded.entities[AClockworkOrange.id]).toBe(AClockworkOrange)
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
