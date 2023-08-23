import { createEntityAdapter, createSlice } from "../..";
import type { PayloadAction, Slice, SliceCaseReducers } from "../..";
import type { DraftableIdSelector, EntityAdapter, EntityState, IdSelector } from "../models";
import type { BookModel } from "./fixtures/book";

describe('Entity Slice Enhancer', () => {
  let slice: Slice<EntityState<BookModel>>;

  beforeEach(() => {
    const indieSlice = entitySliceEnhancer({
      name: 'book',
      selectDraftableId: (book: BookModel) => book.id
    })
    slice = indieSlice
  })

  it('exposes oneAdded', () => {
    const oneAdded = slice.reducer(undefined, slice.actions.oneAdded({
      id: '0',
      title: 'Der Steppenwolf',
      author: 'Herman Hesse'
    }))
    expect(oneAdded.entities['0']?.id).toBe('0')
  })
})

interface EntitySliceArgs<T> {
  name: string
  selectId?: IdSelector<T> // unusable
  selectDraftableId?: DraftableIdSelector<T>
  modelReducer?: SliceCaseReducers<T>
}

function entitySliceEnhancer<T>({
  name,
  selectId: unusableSelectId,
  selectDraftableId,
  modelReducer
}: EntitySliceArgs<T>) {
  const modelAdapter = createEntityAdapter({
    selectId: selectDraftableId // unusableSelectId would give an interesting error
  });

  return createSlice({
    name,
    initialState: modelAdapter.getInitialState(),
    reducers: {
      oneAdded(state, action: PayloadAction<T>) {
        modelAdapter.addOne(
          state,
          action.payload
        )
      },
      ...modelReducer
    }
  })
}
