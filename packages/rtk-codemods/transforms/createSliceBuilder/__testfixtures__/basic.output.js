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

    extraReducers: (builder) => {
        builder.addCase(incrementAsync.pending, (state, action) => {
            // stuff
        });

        builder.addCase(incrementAsync.rejected, todoAdapter.removeAll);

        builder.addCase(incrementAsync.fulfilled, (state, action) => {
            // stuff
        });

        builder.addCase(todoAdded, todoAdapter.addOne);

        builder.addCase(todoAdded1a, (state, action) => {
            // stuff
        });

        builder.addCase(todoAdded1b, (state, action) => action.payload);

        builder.addCase(todoAdded1c + 'test', (state, action) => {
            // stuff
        });

        builder.addCase(todoAdded1d, (state, action) => {
            // stuff
        });

        builder.addCase(todoAdded1e, (state, action) => {
            // stuff
        });

        builder.addCase(todoAdded1f, (state, action) => {
            //stuff
        });

        builder.addCase(todoAdded1g, addOne);
        builder.addCase(todoAdded1h, todoAdapter.addOne);
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

    extraReducers: (builder) => {
        builder.addCase(deleteTodo, (state, action) => {
            // stuff
        });
    }
});
