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

const { addOne } = todoAdapter;

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
        [incrementAsync.fulfilled](state, action) {
            // stuff
        },
        todoAdded: todoAdapter.addOne,

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
        [todoAdded1g]: addOne,
        todoAdded1h: todoAdapter.addOne,
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
