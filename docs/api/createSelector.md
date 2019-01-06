---
id: createSelector
title: createSelector
sidebar_label: createSelector
hide_title: true
---

# `createSelector`

The `createSelector` utility from the [`selectorator` library](https://github.com/planttheidea/selectorator), re-exported for ease of use. It acts as a superset of the standard `createSelector` function from [Reselect](https://github.com/reactjs/reselect). The primary improvements are the ability to define "input selectors" using string keypaths, or return an object result based on an object of keypaths. It also accepts an object of customization options for more specific use cases.

For more specifics, see the [`selectorator` usage documentation](https://github.com/planttheidea/selectorator#usage).

```ts
function createSelector(
  // Can either be:
  //    - An array containing selector functions, string keypaths, and argument objects
  //    - An object whose keys are selector functions and string keypaths
  paths: Array<Function | string | Object> | Object<string, string | Function>
)
```

Example usage:

```js
// Define input selector using a string keypath
const getSubtotal = createSelector(
  ['shop.items'],
  items => {
    // return value here
  }
)

// Define input selectors as a mix of other selectors and string keypaths
const getTax = createSelector(
  [getSubtotal, 'shop.taxPercent'],
  (subtotal, taxPercent) => {
    // return value here
  }
)

// Define input selector using a custom argument index to access a prop
const getTabContent = createSelector(
  [{ path: 'tabIndex', argIndex: 1 }],
  tabIndex => {
    // return value here
  }
)

const getContents = createSelector({ foo: 'foo', bar: 'nested.bar' })
// Returns an object like:  {foo, bar}
```
