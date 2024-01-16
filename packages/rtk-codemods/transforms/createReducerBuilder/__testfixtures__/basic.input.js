import { createEntityAdapter, createReducer } from '@reduxjs/toolkit';

export const todoAdapter = createEntityAdapter();

const todoInitialState = todoAdapter.getInitialState();

createReducer(todoInitialState, {
    [todoAdded1a]: (state, action) => {
        // stuff
    },
    [todoAdded1b]: (state, action) => action.payload,
    [todoAdded1c + 'test']: (state, action) => {
        // stuff
    },
    [todoAdded1d](state, action) {
        // stuff
    },
    [todoAdded1e]: function (state, action) {
        // stuff
    },
    todoAdded1f: (state, action) => {
        //stuff
    },
    [todoAdded1g]: someFunc,
    todoAdded1h: todoAdapter.removeOne,
});

createReducer(todoInitialState, {
    [todoAdded2a]: (state, action) => {
        // stuff
    },
    [todoAdded2b](state, action) {
        // stuff
    },
    [todoAdded2c]: function (state, action) {
        // stuff
    }
});
