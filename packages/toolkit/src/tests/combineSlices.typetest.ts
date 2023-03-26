/* eslint-disable no-lone-blocks */
import type { Reducer, Slice, WithSlice } from '@reduxjs/toolkit'
import { combineSlices } from '@reduxjs/toolkit'
import { expectExactType, expectType } from './helpers'

declare const fooSlice: Slice<true, {}, 'foo'>

declare const barSlice: Slice<true, {}, 'bar'>

declare const bazReducer: Reducer<true>

/**
 * Test: combineSlices correctly combines static state
 */
{
  const rootReducer = combineSlices(fooSlice, barSlice, { baz: bazReducer })
  expectType<{ foo: true; bar: true; baz: true }>(
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
    WithSlice<typeof barSlice> & { baz: true }
  >()

  expectExactType<true | undefined>(true)(
    rootReducer(undefined, { type: '' }).bar
  )
  expectExactType<true | undefined>(true)(
    rootReducer(undefined, { type: '' }).baz
  )

  const injectedReducer = rootReducer.injectSlices(barSlice)
  expectExactType<true>(true)(injectedReducer(undefined, { type: '' }).bar)

  const injectedReducer2 = rootReducer.injectSlices({ baz: bazReducer })
  expectExactType<true>(true)(injectedReducer2(undefined, { type: '' }).baz)
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
