/* eslint-disable no-lone-blocks */
import type { Reducer, Slice, WithSlice } from '@reduxjs/toolkit'
import { combineSlices } from '@reduxjs/toolkit'
import { expectExactType, expectType } from './helpers'

declare const stringSlice: Slice<string, {}, 'string'>

declare const numberSlice: Slice<number, {}, 'number'>

declare const booleanReducer: Reducer<boolean>

/**
 * Test: combineSlices correctly combines static state
 */
{
  const rootReducer = combineSlices(stringSlice, numberSlice, {
    boolean: booleanReducer,
  })
  expectType<{ string: string; number: number; boolean: boolean }>(
    rootReducer(undefined, { type: '' })
  )
}

/**
 * Test: withLazyLoadedSlices adds partial to state
 */
{
  const rootReducer =
    combineSlices(stringSlice).withLazyLoadedSlices<
      WithSlice<typeof numberSlice>
    >()
  expectExactType<number | undefined>(0)(
    rootReducer(undefined, { type: '' }).number
  )
}

/**
 * Test: injectSlices marks injected keys as required
 */
{
  const rootReducer = combineSlices(stringSlice).withLazyLoadedSlices<
    WithSlice<typeof numberSlice> & { boolean: boolean }
  >()

  expectExactType<number | undefined>(0)(
    rootReducer(undefined, { type: '' }).number
  )
  expectExactType<boolean | undefined>(true)(
    rootReducer(undefined, { type: '' }).boolean
  )

  const injectedReducer = rootReducer.injectSlices(numberSlice)
  expectExactType<number>(0)(injectedReducer(undefined, { type: '' }).number)

  const injectedReducer2 = rootReducer.injectSlices({ boolean: booleanReducer })
  expectExactType<boolean>(true)(
    injectedReducer2(undefined, { type: '' }).boolean
  )
}

declare const wrongNumberSlice: Slice<string, {}, 'number'>

declare const wrongBooleanReducer: Reducer<number>

/**
 * Test: slices/reducers can only be injected if first added with withLazyLoadedSlices
 */
{
  const rootReducer = combineSlices(stringSlice)

  // @ts-expect-error number undeclared
  rootReducer.injectSlices(numberSlice)

  // @ts-expect-error boolean undeclared
  rootReducer.injectSlices({
    boolean: booleanReducer,
  })

  const withLazy = rootReducer.withLazyLoadedSlices<
    WithSlice<typeof numberSlice> & { boolean: boolean }
  >()

  // @ts-expect-error right name, wrong state
  withLazy.injectSlices(wrongNumberSlice)

  // @ts-expect-error right name, wrong state
  withLazy.injectSlices({
    boolean: wrongBooleanReducer,
  })

  withLazy.injectSlices(numberSlice, { boolean: booleanReducer })
}

/**
 * Test: selector() allows defining selectors with injected reducers defined
 */
{
  const rootReducer = combineSlices(stringSlice).withLazyLoadedSlices<
    WithSlice<typeof numberSlice> & { boolean: boolean }
  >()

  type RootState = ReturnType<typeof rootReducer>

  const withoutInjection = rootReducer.selector(
    (state: RootState) => state.number
  )

  expectExactType<number | undefined>(0)(
    withoutInjection(rootReducer(undefined, { type: '' }))
  )

  const withInjection = rootReducer
    .injectSlices(numberSlice)
    .selector((state) => state.number)

  expectExactType<number>(0)(
    withInjection(rootReducer(undefined, { type: '' }))
  )
}

/**
 * Test: nested calls inferred correctly
 */
{
  const innerReducer =
    combineSlices(stringSlice).withLazyLoadedSlices<
      WithSlice<typeof numberSlice>
    >()

  const innerSelector = innerReducer.injectSlices(numberSlice).selector(
    (state) => state.number,
    (rootState: RootState) => rootState.inner
  )

  const outerReducer = combineSlices({ inner: innerReducer })

  type RootState = ReturnType<typeof outerReducer>

  expectType<{ inner: { string: string } }>(
    outerReducer(undefined, { type: '' })
  )

  expectType<number>(innerSelector(outerReducer(undefined, { type: '' })))
}

/**
 * Test: selector errors if selectorFn and selectState are mismatched
 */

{
  const combinedReducer =
    combineSlices(stringSlice).withLazyLoadedSlices<
      WithSlice<typeof numberSlice>
    >()

  const outerReducer = combineSlices({ inner: combinedReducer })

  type RootState = ReturnType<typeof outerReducer>

  combinedReducer.selector(
    (state) => state.number,
    // @ts-expect-error wrong state returned
    (rootState: RootState) => rootState.inner.number
  )
  combinedReducer.selector(
    (state, num: number) => state.number,
    // @ts-expect-error wrong arguments
    (rootState: RootState, str: string) => rootState.inner
  )

  combinedReducer.selector(
    (state, num: number) => state.number,
    (rootState: RootState) => rootState.inner
  )

  // TODO: see if there's a way of making this work
  // probably a rare case so not the end of the world if not
  combinedReducer.selector(
    (state) => state.number,
    // @ts-ignore
    (rootState: RootState, num: number) => rootState.inner
  )
}
