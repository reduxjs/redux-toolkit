# Slice Patterns

## `getSelectors` for alternate mounting points

```ts
const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {},
  selectors: {
    selectValue: (state) => state.value,
  },
})

export const { selectValue } = counterSlice.getSelectors(
  (state: { customCounter: { value: number } }) => state.customCounter,
)
```

Use `getSelectors` when the slice is not mounted at its default `reducerPath`.

## `withLazyLoadedSlices` and `injectInto`

```ts
import { combineSlices, createSlice, type WithSlice } from '@reduxjs/toolkit'

const staticSlice = createSlice({
  name: 'static',
  initialState: { ready: true },
  reducers: {},
})

export interface LazyLoadedSlices {}

export const rootReducer =
  combineSlices(staticSlice).withLazyLoadedSlices<LazyLoadedSlices>()

const lazySlice = createSlice({
  name: 'lazy',
  initialState: { value: 0 },
  reducers: {
    increment(state) {
      state.value += 1
    },
  },
})

declare module '../rootReducer' {
  export interface LazyLoadedSlices extends WithSlice<typeof lazySlice> {}
}

export const injectedLazySlice = lazySlice.injectInto(rootReducer)
```

This keeps RootState types aware of reducers that will be injected later.

## Selector caveat

If a selector depends on caller-specific arguments and must be memoized per caller, prefer a selector factory outside `createSlice.selectors`. `createSlice.selectors` gives you one selector instance, not a selector factory.
