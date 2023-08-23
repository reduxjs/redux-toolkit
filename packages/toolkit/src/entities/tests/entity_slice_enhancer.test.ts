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
  const modelAdapter = createEntityAdapter<T>({
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
