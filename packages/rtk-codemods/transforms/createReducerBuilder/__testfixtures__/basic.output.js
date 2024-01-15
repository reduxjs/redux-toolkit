import { createEntityAdapter, createReducer } from '@reduxjs/toolkit';

export const todoAdapter = createEntityAdapter();

const todoInitialState = todoAdapter.getInitialState();

createReducer(todoInitialState, (builder) => {
    builder.addCase(todoAdded1a, (state, action) => {
        // stuff
    });

    builder.addCase(todoRemoved, todoAdapter.removeOne);
    builder.addCase(todoAdded, todoAdapter.addOne);
});

createReducer(todoInitialState, (builder) => {
    builder.addCase(todoAdded, (state, action) => {
        // stuff
    });
});
