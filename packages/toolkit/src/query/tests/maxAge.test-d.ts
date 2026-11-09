import { createApi } from '@reduxjs/toolkit/query/react'

const api = createApi({
  baseQuery: (arg: number) => ({ data: arg }),
  endpoints: (build) => ({
    getValue: build.query<number, number>({ query: (arg) => arg }),
  }),
})

test('lazy triggers accept maxAge and preserve boolean arguments', () => {
  const [trigger] = api.useLazyGetValueQuery()
  trigger(1)
  trigger(1, true)
  trigger(1, false)
  trigger(1, { maxAge: 30 })
  trigger(1, { maxAge: 0, preferCacheValue: true })
  trigger(1, { preferCacheValue: true })
  expectTypeOf(trigger(1, { maxAge: 30 }).unwrap()).toEqualTypeOf<
    Promise<number>
  >()

  // @ts-expect-error maxAge is measured in seconds
  trigger(1, { maxAge: true })
  // @ts-expect-error the endpoint takes a number
  trigger('1', { maxAge: 30 })

  const [subscriptionTrigger] =
    api.endpoints.getValue.useLazyQuerySubscription()
  subscriptionTrigger(1, { maxAge: 30 })
})

test('usePrefetch accepts maxAge defaults and overrides', () => {
  const prefetch = api.usePrefetch('getValue', { maxAge: 30 })
  prefetch(1)
  prefetch(1, { maxAge: 0 })
  // @ts-expect-error maxAge is measured in seconds
  prefetch(1, { maxAge: '30' })
})

test('maxAge remains a call-site option', () => {
  createApi({
    baseQuery: () => ({ data: 1 }),
    endpoints: () => ({}),
    // @ts-expect-error there is no global maxAge
    maxAge: 30,
  })
  // @ts-expect-error there is no declarative hook maxAge
  api.useGetValueQuery(1, { maxAge: 30 })
})
