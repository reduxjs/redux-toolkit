/* eslint-disable no-lone-blocks */
import type { Reducer, Slice, WithSlice } from '@reduxjs/toolkit'
import { combineSlices } from '@reduxjs/toolkit'
import { expectExactType, expectType } from './helpers'

declare const fooSlice: Slice<true, {}, 'foo'>

declare const barSlice: Slice<true, {}, 'bar'>

declare const bazReducer: Reducer<false>

/**
 * Test: combineSlices correctly combines static state
 */
{
  const rootReducer = combineSlices(fooSlice, barSlice, { baz: bazReducer })
  expectType<{ foo: true; bar: true; baz: false }>(
    rootReducer(undefined, { type: '' })
  )
}

/**
 * Test: withLazyLoadedSlices adds partial to state
 */
{
  const rootReducer =
    combineSlices(fooSlice).withLazyLoadedSlices<WithSlice<typeof barSlice>>()
  expectExactType<true | undefined>(true)(
    rootReducer(undefined, { type: '' }).bar
  )
}

/**
 * Test: injectSlices marks injected keys as required
 */
{
  const rootReducer = combineSlices(fooSlice).withLazyLoadedSlices<
    WithSlice<typeof barSlice> & { baz: false }
  >()

  expectExactType<true | undefined>(true)(
    rootReducer(undefined, { type: '' }).bar
  )
  expectExactType<false | undefined>(false)(
    rootReducer(undefined, { type: '' }).baz
  )

  const injectedReducer = rootReducer.injectSlices(barSlice)
  expectExactType<true>(true)(injectedReducer(undefined, { type: '' }).bar)

  const injectedReducer2 = rootReducer.injectSlices({ baz: bazReducer })
  expectExactType<false>(false)(injectedReducer2(undefined, { type: '' }).baz)
}

declare const wrongBarSlice: Slice<false, {}, 'bar'>

declare const wrongBazReducer: Reducer<true>

/**
 * Test: slices/reducers can only be injected if first added with withLazyLoadedSlices
 */
{
  const rootReducer = combineSlices(fooSlice)

  // @ts-expect-error bar undeclared
  rootReducer.injectSlices(barSlice)

  // @ts-expect-error baz undeclared
  rootReducer.injectSlices({
    baz: bazReducer,
  })

  const withLazy = rootReducer.withLazyLoadedSlices<
    WithSlice<typeof barSlice> & { baz: false }
  >()

  // @ts-expect-error right name, wrong state
  withLazy.injectSlices(wrongBarSlice)

  // @ts-expect-error right name, wrong state
  withLazy.injectSlices({
    baz: wrongBazReducer,
  })

  withLazy.injectSlices(barSlice, { baz: bazReducer })
}

/**
 * Test: selector() allows defining selectors with injected reducers defined
 */
{
  const rootReducer = combineSlices(fooSlice).withLazyLoadedSlices<
    WithSlice<typeof barSlice> & { baz: true }
  >()

  type RootState = ReturnType<typeof rootReducer>

  const withoutInjection = (state: RootState) => state.bar

  expectExactType<true | undefined>(true)(
    withoutInjection(rootReducer(undefined, { type: '' }))
  )

  const withInjection = rootReducer
    .injectSlices(barSlice)
    .selector((state) => state.bar)

  expectExactType<true>(true)(
    withInjection(rootReducer(undefined, { type: '' }))
  )
}

/**
 * Test: nested calls inferred correctly
 */
{
  const innerReducer =
    combineSlices(fooSlice).withLazyLoadedSlices<WithSlice<typeof barSlice>>()

  const innerSelector = innerReducer
    .injectSlices(barSlice)
    .selector((state) => state.bar)

  const outerReducer = combineSlices({ inner: innerReducer })

  const outerSelector = outerReducer.selector((state) =>
    innerSelector(state.inner)
  )

  expectType<{ inner: { foo: true } }>(outerReducer(undefined, { type: '' }))
}
