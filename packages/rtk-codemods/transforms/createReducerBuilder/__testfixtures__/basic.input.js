import { createEntityAdapter, createReducer } from '@reduxjs/toolkit';

export const todoAdapter = createEntityAdapter();

const todoInitialState = todoAdapter.getInitialState();

createReducer(todoInitialState, {
    [todoAdded1a]: (state, action) => {
        // stuff
    },
    [todoRemoved]: todoAdapter.removeOne,
    todoAdded: todoAdapter.addOne
});

createReducer(todoInitialState, {
    [todoAdded](state, action) {
        // stuff
    }
});
