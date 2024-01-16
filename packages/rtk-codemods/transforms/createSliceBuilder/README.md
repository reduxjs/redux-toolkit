# createSliceBuilder

Rewrites uses of the `extraReducers` "object" syntax for Redux Toolkit's `createSlice` API to use the "builder callback" syntax instead, in preparation for removal of the object syntax in RTK 2.0.

Should work with both JS and TS files.

## Usage

```bash
npx @reduxjs/rtk-codemods createSliceBuilder path/of/files/ or/some**/*glob.js

# or

yarn global add @reduxjs/rtk-codemods
rtk-codemods createSliceBuilder path/of/files/ or/some**/*glob.js
```

## Local Usage

```
node ./bin/cli.js createSliceBuilder path/of/files/ or/some**/*glob.js
```

## Input / Output

<!--FIXTURES_TOC_START-->

- [basic-ts](#basic-ts)
- [basic](#basic)
<!--FIXTURES_TOC_END-->

## <!--FIXTURES_CONTENT_START-->

---

<a id="basic-ts">**basic-ts**</a>

**Input** (<small>[basic-ts.input.ts](transforms\createSliceBuilder__testfixtures__\basic-ts.input.ts)</small>):

```ts
import type { PayloadAction } from '@reduxjs/toolkit'
import {
  createAsyncThunk,
  createEntityAdapter,
  createSlice
} from '@reduxjs/toolkit'

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
      action: PayloadAction<string>
    ) {
      // stuff
    },
    todoAdded: todoAdapter.addOne,

    [todoAdded1a]: (state: TodoSliceState, action: PayloadAction<string>) => {
      // stuff
    },
    [todoAdded1b]: (state: TodoSliceState, action: PayloadAction<string>) =>
      action.payload,
    [todoAdded1c + 'test']: (
      state: TodoSliceState,
      action: PayloadAction<string>
    ) => {
      // stuff
    },
    [todoAdded1d](state: TodoSliceState, action: PayloadAction<string>) {
      // stuff
    },
    [todoAdded1e]: function (
      state: TodoSliceState,
      action: PayloadAction<string>
    ) {
      // stuff
    },
    todoAdded1f: (state: TodoSliceState, action: PayloadAction<string>) => {
      //stuff
    },
    [todoAdded1g]: addOne,
    todoAdded1h: todoAdapter.addOne
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
```

**Output** (<small>[basic-ts.output.ts](transforms\createSliceBuilder__testfixtures__\basic-ts.output.ts)</small>):

```ts
import type { PayloadAction } from '@reduxjs/toolkit'
import {
  createAsyncThunk,
  createEntityAdapter,
  createSlice
} from '@reduxjs/toolkit'

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

  extraReducers: (builder) => {
    builder.addCase(
      incrementAsync.pending,
      (state: TodoSliceState, action: PayloadAction<string>) => {
        // stuff
      }
    )

    builder.addCase(incrementAsync.rejected, todoAdapter.removeAll)

    builder.addCase(
      incrementAsync.fulfilled,
      (state: TodoSliceState, action: PayloadAction<string>) => {
        // stuff
      }
    )

    builder.addCase(todoAdded, todoAdapter.addOne)

    builder.addCase(
      todoAdded1a,
      (state: TodoSliceState, action: PayloadAction<string>) => {
        // stuff
      }
    )

    builder.addCase(
      todoAdded1b,
      (state: TodoSliceState, action: PayloadAction<string>) => action.payload
    )

    builder.addCase(
      todoAdded1c + 'test',
      (state: TodoSliceState, action: PayloadAction<string>) => {
        // stuff
      }
    )

    builder.addCase(
      todoAdded1d,
      (state: TodoSliceState, action: PayloadAction<string>) => {
        // stuff
      }
    )

    builder.addCase(
      todoAdded1e,
      (state: TodoSliceState, action: PayloadAction<string>) => {
        // stuff
      }
    )

    builder.addCase(
      todoAdded1f,
      (state: TodoSliceState, action: PayloadAction<string>) => {
        //stuff
      }
    )

    builder.addCase(todoAdded1g, addOne)
    builder.addCase(todoAdded1h, todoAdapter.addOne)
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

  extraReducers: (builder) => {
    builder.addCase(
      deleteTodo,
      (state: CounterSliceState, action: PayloadAction<string>) => {
        // stuff
      }
    )
  }
})
```

---

<a id="basic">**basic**</a>

**Input** (<small>[basic.input.js](transforms\createSliceBuilder__testfixtures__\basic.input.js)</small>):

```js
import {
  createAsyncThunk,
  createEntityAdapter,
  createSlice
} from '@reduxjs/toolkit'

export const todoAdapter = createEntityAdapter()

const todoInitialState = todoAdapter.getInitialState()

const fetchCount = (amount = 1) => {
  return new Promise((resolve) =>
    setTimeout(() => resolve({ data: amount }), 500)
  )
}

export const incrementAsync = createAsyncThunk(
  'counter/fetchCount',
  async (amount) => {
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
    todoAdded1h: todoAdapter.addOne
  }
})

export const { deleteTodo } = todoSlice.actions

const counterInitialState = {
  value: 0,
  status: 'idle'
}

const counterSlice = createSlice({
  name: 'counter',
  initialState: counterInitialState,
  extraReducers: {
    [deleteTodo](state, action) {
      // stuff
    }
  }
})
```

**Output** (<small>[basic.output.js](transforms\createSliceBuilder__testfixtures__\basic.output.js)</small>):

```js
import {
  createAsyncThunk,
  createEntityAdapter,
  createSlice
} from '@reduxjs/toolkit'

export const todoAdapter = createEntityAdapter()

const todoInitialState = todoAdapter.getInitialState()

const fetchCount = (amount = 1) => {
  return new Promise((resolve) =>
    setTimeout(() => resolve({ data: amount }), 500)
  )
}

export const incrementAsync = createAsyncThunk(
  'counter/fetchCount',
  async (amount) => {
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

  extraReducers: (builder) => {
    builder.addCase(incrementAsync.pending, (state, action) => {
      // stuff
    })

    builder.addCase(incrementAsync.rejected, todoAdapter.removeAll)

    builder.addCase(incrementAsync.fulfilled, (state, action) => {
      // stuff
    })

    builder.addCase(todoAdded, todoAdapter.addOne)

    builder.addCase(todoAdded1a, (state, action) => {
      // stuff
    })

    builder.addCase(todoAdded1b, (state, action) => action.payload)

    builder.addCase(todoAdded1c + 'test', (state, action) => {
      // stuff
    })

    builder.addCase(todoAdded1d, (state, action) => {
      // stuff
    })

    builder.addCase(todoAdded1e, (state, action) => {
      // stuff
    })

    builder.addCase(todoAdded1f, (state, action) => {
      //stuff
    })

    builder.addCase(todoAdded1g, addOne)
    builder.addCase(todoAdded1h, todoAdapter.addOne)
  }
})

export const { deleteTodo } = todoSlice.actions

const counterInitialState = {
  value: 0,
  status: 'idle'
}

const counterSlice = createSlice({
  name: 'counter',
  initialState: counterInitialState,

  extraReducers: (builder) => {
    builder.addCase(deleteTodo, (state, action) => {
      // stuff
    })
  }
})
```

<!--FIXTURES_CONTENT_END-->
