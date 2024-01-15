import { createAsyncThunk, createEntityAdapter, createSlice } from '@reduxjs/toolkit';

export const todoAdapter = createEntityAdapter();

const todoInitialState = todoAdapter.getInitialState();

const fetchCount = (amount = 1) => {
    return new Promise((resolve) => setTimeout(() => resolve({ data: amount }), 500));
};

export const incrementAsync = createAsyncThunk('counter/fetchCount', async (amount) => {
    const response = await fetchCount(amount);
    return response.data;
});

const todoSlice = createSlice({
    name: 'todo',
    initialState: todoInitialState,
    reducers: {
        deleteTodo: todoAdapter.removeOne
    },
    extraReducers: {
        [incrementAsync.pending]: (state, action) => {
            // stuff
        },
        [incrementAsync.rejected]: todoAdapter.removeAll,
        todoAdded: todoAdapter.addOne
    }
});

export const { deleteTodo } = todoSlice.actions;

const counterInitialState = {
    value: 0,
    status: 'idle'
};

const counterSlice = createSlice({
    name: 'counter',
    initialState: counterInitialState,
    extraReducers: {
        [deleteTodo](state, action) {
            // stuff
        }
    }
});
