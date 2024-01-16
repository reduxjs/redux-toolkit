# createSliceReducerBuilder

Rewrites uses of Redux Toolkit's `createSlice` API to use the "builder callback" syntax for the `reducers` field, to make it easier to add prepared reducers and thunks inside of `createSlice`.

Note that unlike the `createReducerBuilder` and `createSliceBuilder` transforms (which both were fixes for deprecated/removed overloads), this is entirely optional. You do not _need_ to apply this to an entire codebase unless you specifically want to. Otherwise, feel free to apply to to specific slice files as needed.

Should work with both JS and TS files.

## Usage

```
npx @reduxjs/rtk-codemods createSliceReducerBuilder path/of/files/ or/some**/*glob.js

# or

yarn global add @reduxjs/rtk-codemods
@reduxjs/rtk-codemods createSliceReducerBuilder path/of/files/ or/some**/*glob.js
```

## Local Usage

```
node ./bin/cli.js createSliceReducerBuilder path/of/files/ or/some**/*glob.js
```

## Input / Output

<!--FIXTURES_TOC_START-->

- [basic-ts](#basic-ts)
- [basic](#basic)
<!--FIXTURES_TOC_END-->

## <!--FIXTURES_CONTENT_START-->

<a id="basic-ts">**basic-ts**</a>

**Input** (<small>[basic-ts.input.ts](transforms\createSliceReducerBuilder__testfixtures__\basic-ts.input.ts)</small>):

```ts
import type { PayloadAction } from '@reduxjs/toolkit'
import { createEntityAdapter, createSlice, nanoid } from '@reduxjs/toolkit'

function withPayload(): any {
  throw new Error('Function not implemented.')
}

export interface Todo {
  id: string
  title: string
}

export const todoAdapter = createEntityAdapter<Todo>()

const todoSlice = createSlice({
  name: 'todo',
  initialState: todoAdapter.getInitialState(),
  reducers: {
    property: () => {},
    method(state, action: PayloadAction<Todo>) {
      todoAdapter.addOne(state, action)
    },
    identifier: todoAdapter.removeOne,
    preparedProperty: {
      prepare: (todo: Omit<Todo, 'id'>) => ({
        payload: { id: nanoid(), ...todo }
      }),
      reducer: () => {}
    },
    preparedMethod: {
      prepare(todo: Omit<Todo, 'id'>) {
        return { payload: { id: nanoid(), ...todo } }
      },
      reducer(state, action: PayloadAction<Todo>) {
        todoAdapter.addOne(state, action)
      }
    },
    preparedIdentifier: {
      prepare: withPayload(),
      reducer: todoAdapter.setMany
    }
  }
})
```

**Output** (<small>[basic-ts.output.ts](transforms\createSliceReducerBuilder__testfixtures__\basic-ts.output.ts)</small>):

```ts
import type { PayloadAction } from '@reduxjs/toolkit'
import { createEntityAdapter, createSlice, nanoid } from '@reduxjs/toolkit'

function withPayload(): any {
  throw new Error('Function not implemented.')
}

export interface Todo {
  id: string
  title: string
}

export const todoAdapter = createEntityAdapter<Todo>()

const todoSlice = createSlice({
  name: 'todo',
  initialState: todoAdapter.getInitialState(),

  reducers: (create) => ({
    property: create.reducer(() => {}),

    method: create.reducer((state, action: PayloadAction<Todo>) => {
      todoAdapter.addOne(state, action)
    }),

    identifier: create.reducer(todoAdapter.removeOne),

    preparedProperty: create.preparedReducer(
      (todo: Omit<Todo, 'id'>) => ({
        payload: { id: nanoid(), ...todo }
      }),
      () => {}
    ),

    preparedMethod: create.preparedReducer(
      (todo: Omit<Todo, 'id'>) => {
        return { payload: { id: nanoid(), ...todo } }
      },
      (state, action: PayloadAction<Todo>) => {
        todoAdapter.addOne(state, action)
      }
    ),

    preparedIdentifier: create.preparedReducer(
      withPayload(),
      todoAdapter.setMany
    )
  })
})
```

---

<a id="basic">**basic**</a>

**Input** (<small>[basic.input.js](transforms\createSliceReducerBuilder__testfixtures__\basic.input.js)</small>):

```js
import { createEntityAdapter, createSlice, nanoid } from '@reduxjs/toolkit'

function withPayload() {
  throw new Error('Function not implemented.')
}

export const todoAdapter = createEntityAdapter()

const todoSlice = createSlice({
  name: 'todo',
  initialState: todoAdapter.getInitialState(),
  reducers: {
    property: () => {},
    method(state, action) {
      todoAdapter.addOne(state, action)
    },
    identifier: todoAdapter.removeOne,
    preparedProperty: {
      prepare: (todo) => ({
        payload: { id: nanoid(), ...todo }
      }),
      reducer: () => {}
    },
    preparedMethod: {
      prepare(todo) {
        return { payload: { id: nanoid(), ...todo } }
      },
      reducer(state, action) {
        todoAdapter.addOne(state, action)
      }
    },
    preparedIdentifier: {
      prepare: withPayload(),
      reducer: todoAdapter.setMany
    }
  }
})
```

**Output** (<small>[basic.output.js](transforms\createSliceReducerBuilder__testfixtures__\basic.output.js)</small>):

```js
import { createEntityAdapter, createSlice, nanoid } from '@reduxjs/toolkit'

function withPayload() {
  throw new Error('Function not implemented.')
}

export const todoAdapter = createEntityAdapter()

const todoSlice = createSlice({
  name: 'todo',
  initialState: todoAdapter.getInitialState(),

  reducers: (create) => ({
    property: create.reducer(() => {}),

    method: create.reducer((state, action) => {
      todoAdapter.addOne(state, action)
    }),

    identifier: create.reducer(todoAdapter.removeOne),

    preparedProperty: create.preparedReducer(
      (todo) => ({
        payload: { id: nanoid(), ...todo }
      }),
      () => {}
    ),

    preparedMethod: create.preparedReducer(
      (todo) => {
        return { payload: { id: nanoid(), ...todo } }
      },
      (state, action) => {
        todoAdapter.addOne(state, action)
      }
    ),

    preparedIdentifier: create.preparedReducer(
      withPayload(),
      todoAdapter.setMany
    )
  })
})
```

<!--FIXTURES_CONTENT_END-->
