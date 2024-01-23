import type { PayloadAction } from '@reduxjs/toolkit'
import { createEntityAdapter, createReducer } from '@reduxjs/toolkit'

export interface Todo {
  id: string
  title: string
}

// This only included to make sure the codemod does not
// throw a runtime error when faced with TS 4.7+ syntax such as
// the `satisfies` operator and instantiation expressions
const someString = 'someString' satisfies string

export const todoAdapter = createEntityAdapter<Todo>()

const todoInitialState = todoAdapter.getInitialState()

export type TodoSliceState = typeof todoInitialState

const { addOne } = todoAdapter

createReducer(todoInitialState, (builder) => {
  builder.addCase(todoAdded1a, (state: TodoSliceState, action: PayloadAction<string>) => {
    // stuff
  });

  builder.addCase(
    todoAdded1b,
    (state: TodoSliceState, action: PayloadAction<string>) => action.payload
  );

  builder.addCase(
    todoAdded1c + 'test',
    (state: TodoSliceState, action: PayloadAction<string>) => {
      // stuff
    }
  );

  builder.addCase(todoAdded1d, (state: TodoSliceState, action: PayloadAction<string>) => {
    // stuff
  });

  builder.addCase(todoAdded1e, (state: TodoSliceState, action: PayloadAction<string>) => {
    // stuff
  });

  builder.addCase(todoAdded1f, (state: TodoSliceState, action: PayloadAction<string>) => {
    //stuff
  });

  builder.addCase(todoAdded1g, addOne);
  builder.addCase(todoAdded1h, todoAdapter.addOne);
})

createReducer(todoInitialState, (builder) => {
  builder.addCase(todoAdded2a, (state: TodoSliceState, action: PayloadAction<string>) => {
    // stuff
  });

  builder.addCase(todoAdded2b, (state: TodoSliceState, action: PayloadAction<string>) => {
    // stuff
  });

  builder.addCase(todoAdded2c, (state: TodoSliceState, action: PayloadAction<string>) => {
    // stuff
  });
})
