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
<!--FIXTURES_TOC_END-->

<!--FIXTURES_CONTENT_START-->
<!--FIXTURES_CONTENT_END-->
