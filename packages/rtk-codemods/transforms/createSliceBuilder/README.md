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
node ./bin/cli.mjs createSliceBuilder path/of/files/ or/some**/*glob.js
```

## Input / Output

<!--FIXTURES_TOC_START-->

- [basic-ts](#basic-ts)
- [basic](#basic)
<!--FIXTURES_TOC_END-->

## <!--FIXTURES_CONTENT_START-->

<a id="basic-ts">**basic-ts**</a>

**Input** (<small>[basic-ts.input.ts](transforms\createSliceBuilder__testfixtures__\basic-ts.input.ts)</small>):

```ts
const slice1 = createSlice({
  name: 'a',
  initialState,
  extraReducers: {
    [todoAdded]: (state: SliceState, action: PayloadAction<string>) => {
      // stuff
    },
  },
})

const slice2 = createSlice({
  name: 'b',
  initialState,
  extraReducers: {
    [todoAdded](state: SliceState, action: PayloadAction<string>) {
      // stuff
    },
  },
})
```

**Output** (<small>[basic-ts.output.ts](transforms\createSliceBuilder__testfixtures__\basic-ts.output.ts)</small>):

```ts
const slice1 = createSlice({
  name: 'a',
  initialState,

  extraReducers: (builder) => {
    builder.addCase(
      todoAdded,
      (state: SliceState, action: PayloadAction<string>) => {
        // stuff
      },
    )
  },
})

const slice2 = createSlice({
  name: 'b',
  initialState,

  extraReducers: (builder) => {
    builder.addCase(
      todoAdded,
      (state: SliceState, action: PayloadAction<string>) => {
        // stuff
      },
    )
  },
})
```

---

<a id="basic">**basic**</a>

**Input** (<small>[basic.input.js](transforms\createSliceBuilder__testfixtures__\basic.input.js)</small>):

```js
const slice1 = createSlice({
  name: 'a',
  initialState: {},
  extraReducers: {
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
  },
})

const slice2 = createSlice({
  name: 'b',
  initialState: {},
  extraReducers: {
    [todoAdded2a]: (state, action) => {
      // stuff
    },
    [todoAdded2b](state, action) {
      // stuff
    },
    [todoAdded2c]: function (state, action) {
      // stuff
    },
  },
})
```

**Output** (<small>[basic.output.js](transforms\createSliceBuilder__testfixtures__\basic.output.js)</small>):

```js
const slice1 = createSlice({
  name: 'a',
  initialState: {},

  extraReducers: (builder) => {
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
  },
})

const slice2 = createSlice({
  name: 'b',
  initialState: {},

  extraReducers: (builder) => {
    builder.addCase(todoAdded2a, (state, action) => {
      // stuff
    })

    builder.addCase(todoAdded2b, (state, action) => {
      // stuff
    })

    builder.addCase(todoAdded2c, (state, action) => {
      // stuff
    })
  },
})
```

<!--FIXTURES_CONTENT_END-->
