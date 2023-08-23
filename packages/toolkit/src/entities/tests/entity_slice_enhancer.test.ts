import { createEntityAdapter, createSlice } from "../..";
import type { PayloadAction, SliceCaseReducers } from "../..";
import type { DraftableIdSelector, IdSelector } from "../models";

interface EntitySliceArgs<T> {
  name: string
  modelReducer: SliceCaseReducers<T>
  selectId: IdSelector<T> // unusable
  selectDraftableId: DraftableIdSelector<T>
}

// currently this never runs, it only serves to illustrate that the containing calls are type valid
function entitySliceEnhancer<T>({
  name,
  modelReducer,
  selectId: undraftableSelectId,
  selectDraftableId
}: EntitySliceArgs<T>) {
  const modelAdapter = createEntityAdapter<T>({
    selectId: selectDraftableId // undraftableSelectId would give an interesting error
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
