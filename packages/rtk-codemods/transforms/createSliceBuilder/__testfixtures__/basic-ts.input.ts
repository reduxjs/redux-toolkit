import type { PayloadAction } from '@reduxjs/toolkit';
import {
  createAsyncThunk,
  createEntityAdapter,
  createSlice
} from '@reduxjs/toolkit';

export interface Todo {
  id: string
  title: string
}

export const todoAdapter = createEntityAdapter<Todo>()

const todoInitialState = todoAdapter.getInitialState()

export type TodoSliceState = typeof todoInitialState

const fetchCount = (amount = 1) => {
  return new Promise<{ data: number }>((resolve) =>
    setTimeout(() => resolve({ data: amount }), 500)
  )
}

export const incrementAsync = createAsyncThunk(
  'counter/fetchCount',
  async (amount: number) => {
    const response = await fetchCount(amount)
    return response.data
  }
)

const { addOne } = todoAdapter

const todoSlice = createSlice({
  name: 'todo',
  initialState: todoInitialState,
  reducers: {
    deleteTodo: todoAdapter.removeOne
  },
  extraReducers: {
    [incrementAsync.pending]: (
      state: TodoSliceState,
      action: PayloadAction<string>
    ) => {
      // stuff
    },
    [incrementAsync.rejected]: todoAdapter.removeAll,
    [incrementAsync.fulfilled](
      state: TodoSliceState,
      action: PayloadAction<string>) {
      // stuff
    },
    todoAdded: todoAdapter.addOne,

    [todoAdded1a]: (state: TodoSliceState, action: PayloadAction<string>) => {
      // stuff
    },
    [todoAdded1b]: (state: TodoSliceState, action: PayloadAction<string>) => action.payload,
    [todoAdded1c + 'test']: (state:TodoSliceState, action: PayloadAction<string>) => {
      // stuff
    },
    [todoAdded1d](state: TodoSliceState, action: PayloadAction<string>) {
      // stuff
    },
    [todoAdded1e]: function(state: TodoSliceState, action: PayloadAction<string>) {
      // stuff
    },
    todoAdded1f: (state: TodoSliceState, action: PayloadAction<string>) => {
      //stuff
    },
    [todoAdded1g]: addOne,
    todoAdded1h: todoAdapter.addOne,
  }
})

export const { deleteTodo } = todoSlice.actions

export interface CounterSliceState {
  value: number
  status: 'idle' | 'loading' | 'failed'
}

const counterInitialState: CounterSliceState = {
  value: 0,
  status: 'idle'
}

const counterSlice = createSlice({
  name: 'counter',
  initialState: counterInitialState,
  extraReducers: {
    [deleteTodo](state: CounterSliceState, action: PayloadAction<string>) {
      // stuff
    }
  }
})
