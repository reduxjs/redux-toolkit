/* eslint-disable no-lone-blocks */
import type { Reducer, Slice, WithSlice } from '@reduxjs/toolkit'
import { combineSlices } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query'
import { expectExactType, expectType } from './helpers'

declare const stringSlice: Slice<string, {}, 'string'>

declare const numberSlice: Slice<number, {}, 'number'>

declare const booleanReducer: Reducer<boolean>

const exampleApi = createApi({
  baseQuery: fetchBaseQuery(),
  endpoints: (build) => ({
    getThing: build.query({
      query: () => '',
    }),
  }),
})

type ExampleApiState = ReturnType<typeof exampleApi.reducer>

/**
 * Test: combineSlices correctly combines static state
 */
{
  const rootReducer = combineSlices(stringSlice, numberSlice, exampleApi, {
    boolean: booleanReducer,
  })
  expectType<{
    string: string
    number: number
    boolean: boolean
    api: ExampleApiState
  }>(rootReducer(undefined, { type: '' }))
}

/**
 * Test: withLazyLoadedSlices adds partial to state
 */
{
  const rootReducer = combineSlices(stringSlice).withLazyLoadedSlices<
    WithSlice<typeof numberSlice> & WithSlice<typeof exampleApi>
  >()
  expectExactType<number | undefined>(0)(
    rootReducer(undefined, { type: '' }).number
  )
  expectExactType<ExampleApiState | undefined>(undefined)(
    rootReducer(undefined, { type: '' }).api
  )
}

/**
 * Test: inject marks injected keys as required
 */
{
  const rootReducer = combineSlices(stringSlice).withLazyLoadedSlices<
    WithSlice<typeof numberSlice> &
      WithSlice<typeof exampleApi> & { boolean: boolean }
  >()

  expectExactType<number | undefined>(0)(
    rootReducer(undefined, { type: '' }).number
  )
  expectExactType<boolean | undefined>(true)(
    rootReducer(undefined, { type: '' }).boolean
  )
  expectExactType<ExampleApiState | undefined>(undefined)(
    rootReducer(undefined, { type: '' }).api
  )

  const withNumber = rootReducer.inject(numberSlice)
  expectExactType<number>(0)(withNumber(undefined, { type: '' }).number)

  const withBool = rootReducer.inject({
    reducerPath: 'boolean' as const,
    reducer: booleanReducer,
  })
  expectExactType<boolean>(true)(withBool(undefined, { type: '' }).boolean)

  const withApi = rootReducer.inject(exampleApi)
  expectExactType<ExampleApiState>({} as ExampleApiState)(
    withApi(undefined, { type: '' }).api
  )
}

declare const wrongNumberSlice: Slice<string, {}, 'number'>

declare const wrongBooleanReducer: Reducer<number>

const wrongApi = createApi({
  baseQuery: fetchBaseQuery(),
  endpoints: (build) => ({
    getThing2: build.query({
      query: () => '',
    }),
  }),
})

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
    .inject(numberSlice)
    .selector((state) => state.number)

  expectExactType<number>(0)(
    withInjection(rootReducer(undefined, { type: '' }))
  )
}

/**
 * Test: selector() passes arguments through
 */
{
  const rootReducer = combineSlices(stringSlice).withLazyLoadedSlices<
    WithSlice<typeof numberSlice> & { boolean: boolean }
  >()

  const selector = rootReducer
    .inject(numberSlice)
    .selector((state, num: number) => state.number)

  const state = rootReducer(undefined, { type: '' })
  // @ts-expect-error required argument
  selector(state)
  // @ts-expect-error number not string
  selector(state, '')
  selector(state, 0)
}

/**
 * Test: nested calls inferred correctly
 */
{
  const innerReducer =
    combineSlices(stringSlice).withLazyLoadedSlices<
      WithSlice<typeof numberSlice>
    >()

  const innerSelector = innerReducer.inject(numberSlice).selector(
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
