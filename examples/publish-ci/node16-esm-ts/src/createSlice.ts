import { createSlice } from '@reduxjs/toolkit';
import type { UnknownAction } from '@reduxjs/toolkit';
import { adapter } from './createEntityAdapter.js';
import type { Item, ItemMeta } from './types.js';
import { actionItemAddMany, actionItemAddOne, actionItemSetFocus, actionItemsGenerate } from './createAction.js';

const name = 'items';

const initialState: ItemMeta = {
    focusedId: null,
};

export const slice = createSlice({
    name,
    initialState,
    reducers: {},
});

export const sliceReducerObject = createSlice({
    name,
    initialState: adapter.getInitialState(initialState),
    reducers: {
        addOne: adapter.addOne,
        addMany: adapter.addMany,
        updateOne: adapter.updateOne,
        updateMany: adapter.updateMany,
        removeOne: adapter.removeOne,
        removeMany: adapter.removeMany,
        removeAll: adapter.removeAll,
        upsertOne: adapter.upsertOne,
        upsertMany: adapter.upsertMany,
    },
});

export const sliceReducerCreators = createSlice({
    name,
    initialState: adapter.getInitialState(initialState),
    reducers: (creators) => ({
        addOnePrepared: creators.preparedReducer(
            (item: Item) => ({ payload: item }),
            adapter.addOne,
        ),
        addOneThunk: creators.asyncThunk(
            async (item: Item, thunkApi) => (thunkApi.fulfillWithValue({ payload: item, })),
        ),
        addOneReducer: creators.reducer(
            adapter.addOne,
        )
    }),
});

export const sliceExtraReducers = createSlice({
    name,
    initialState: adapter.getInitialState({ lastAction: '', ...initialState}),
    reducers: {},
    extraReducers: (builder) => {
        builder.addCase(actionItemSetFocus, (state, action) => {
            state.focusedId = action.payload;
        });

        builder.addCase(actionItemAddOne, (state, action) => {
            adapter.addOne(state, action.payload);
        });

        builder.addCase(actionItemAddMany, (state, action) => {
            adapter.addMany(state, action.payload);
        });

        builder.addCase(actionItemsGenerate, adapter.addMany);

        builder.addMatcher(
            (action: UnknownAction) => action.type.startsWith('item'),
            (state, action) => {
                state.lastAction = action.type;
            }
        );
    },
});