# createReducerBuilder

Rewrites uses of the "object" syntax for Redux Toolkit's `createReducer` API to use the "builder callback" syntax instead, in preparation for removal of the object syntax in RTK 2.0.

Should work with both JS and TS files.

## Usage

```bash
npx @reduxjs/rtk-codemods createReducerBuilder path/of/files/ or/some**/*glob.js

# or

yarn global add @reduxjs/rtk-codemods
rtk-codemods createReducerBuilder path/of/files/ or/some**/*glob.js
```

## Local Usage

```
node ./bin/cli.js createReducerBuilder path/of/files/ or/some**/*glob.js
```

## Input / Output

<!--FIXTURES_TOC_START-->

- [basic-ts](#basic-ts)
- [basic](#basic)
<!--FIXTURES_TOC_END-->

## <!--FIXTURES_CONTENT_START-->

---

<a id="basic-ts">**basic-ts**</a>

**Input** (<small>[basic-ts.input.ts](transforms\createReducerBuilder__testfixtures__\basic-ts.input.ts)</small>):

```ts
import type { PayloadAction } from '@reduxjs/toolkit'
import { createEntityAdapter, createReducer } from '@reduxjs/toolkit'

export interface Todo {
  id: string
  title: string
}

export const todoAdapter = createEntityAdapter<Todo>()

const todoInitialState = todoAdapter.getInitialState()

export type TodoSliceState = typeof todoInitialState

const { addOne } = todoAdapter

createReducer(todoInitialState, {
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
})

createReducer(todoInitialState, {
  [todoAdded2a]: (state: TodoSliceState, action: PayloadAction<string>) => {
    // stuff
  },
  [todoAdded2b](state: TodoSliceState, action: PayloadAction<string>) {
    // stuff
  },
  [todoAdded2c]: function (
    state: TodoSliceState,
    action: PayloadAction<string>
  ) {
    // stuff
  }
})
```

**Output** (<small>[basic-ts.output.ts](transforms\createReducerBuilder__testfixtures__\basic-ts.output.ts)</small>):

```ts
import type { PayloadAction } from '@reduxjs/toolkit'
import { createEntityAdapter, createReducer } from '@reduxjs/toolkit'

export interface Todo {
  id: string
  title: string
}

export const todoAdapter = createEntityAdapter<Todo>()

const todoInitialState = todoAdapter.getInitialState()

export type TodoSliceState = typeof todoInitialState

const { addOne } = todoAdapter

createReducer(todoInitialState, (builder) => {
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
})

createReducer(todoInitialState, (builder) => {
  builder.addCase(
    todoAdded2a,
    (state: TodoSliceState, action: PayloadAction<string>) => {
      // stuff
    }
  )

  builder.addCase(
    todoAdded2b,
    (state: TodoSliceState, action: PayloadAction<string>) => {
      // stuff
    }
  )

  builder.addCase(
    todoAdded2c,
    (state: TodoSliceState, action: PayloadAction<string>) => {
      // stuff
    }
  )
})
```

---

<a id="basic">**basic**</a>

**Input** (<small>[basic.input.js](transforms\createReducerBuilder__testfixtures__\basic.input.js)</small>):

```js
import { createEntityAdapter, createReducer } from '@reduxjs/toolkit'

export const todoAdapter = createEntityAdapter()

const todoInitialState = todoAdapter.getInitialState()

const { addOne } = todoAdapter

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
  [todoAdded1g]: addOne,
  todoAdded1h: todoAdapter.addOne
})

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
})
```

**Output** (<small>[basic.output.js](transforms\createReducerBuilder__testfixtures__\basic.output.js)</small>):

```js
import { createEntityAdapter, createReducer } from '@reduxjs/toolkit'

export const todoAdapter = createEntityAdapter()

const todoInitialState = todoAdapter.getInitialState()

const { addOne } = todoAdapter

createReducer(todoInitialState, (builder) => {
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
})

createReducer(todoInitialState, (builder) => {
  builder.addCase(todoAdded2a, (state, action) => {
    // stuff
  })

  builder.addCase(todoAdded2b, (state, action) => {
    // stuff
  })

  builder.addCase(todoAdded2c, (state, action) => {
    // stuff
  })
})
```

<!--FIXTURES_CONTENT_END-->
