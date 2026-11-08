import type {
  InfiniteData,
  PollingInterval,
  QueryCacheKey,
  SubscriptionOptions,
} from '@reduxjs/toolkit/query/react'
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react'
import { configureStore } from '@reduxjs/toolkit'
import type { SerializedError } from '@reduxjs/toolkit'

type Job = { id: number; status: 'RUNNING' | 'DONE' }

const api = createApi({
  baseQuery: fakeBaseQuery<{ message: string }>(),
  endpoints: (build) => ({
    getJob: build.query<Job, number>({
      queryFn: (id) => ({ data: { id, status: 'RUNNING' } }),
    }),
    getJobs: build.infiniteQuery<Job[], string, number>({
      infiniteQueryOptions: {
        initialPageParam: 0,
        getNextPageParam: (_lastPage, _allPages, lastPageParam) =>
          lastPageParam + 1,
      },
      queryFn: () => ({ data: [] }),
    }),
  }),
})

describe('type tests', () => {
  test('useQuery passes the typed cache entry to a pollingInterval function', () => {
    api.endpoints.getJob.useQuery(1, {
      pollingInterval: (entry) => {
        expectTypeOf(entry.data).toEqualTypeOf<Job | undefined>()
        expectTypeOf(entry.originalArgs).toEqualTypeOf<number>()
        expectTypeOf(entry.error).toEqualTypeOf<
          { message: string } | SerializedError | undefined
        >()
        expectTypeOf(entry.queryCacheKey).toEqualTypeOf<QueryCacheKey>()

        return entry.data?.status === 'RUNNING' ? 1000 : 0
      },
    })

    api.endpoints.getJob.useQuerySubscription(1, {
      pollingInterval: (entry) => {
        expectTypeOf(entry.data).toEqualTypeOf<Job | undefined>()
        return 1000
      },
    })

    api.useGetJobQuery(1, { pollingInterval: 1000 })
  })

  test('lazy query hooks accept a pollingInterval function', () => {
    api.endpoints.getJob.useLazyQuery({
      pollingInterval: (entry) => {
        expectTypeOf(entry.data).toEqualTypeOf<Job | undefined>()
        return 1000
      },
    })

    api.endpoints.getJob.useLazyQuerySubscription({
      pollingInterval: (entry) => {
        expectTypeOf(entry.data).toEqualTypeOf<Job | undefined>()
        return 1000
      },
    })
  })

  test('infinite query hooks pass InfiniteData to a pollingInterval function', () => {
    api.endpoints.getJobs.useInfiniteQuery('a', {
      pollingInterval: (entry) => {
        expectTypeOf(entry.data).toEqualTypeOf<
          InfiniteData<Job[], number> | undefined
        >()
        return 1000
      },
    })

    api.endpoints.getJobs.useInfiniteQuerySubscription('a', {
      pollingInterval: (entry) => {
        expectTypeOf(entry.data).toEqualTypeOf<
          InfiniteData<Job[], number> | undefined
        >()
        return 1000
      },
    })
  })

  test('initiate accepts a pollingInterval function', () => {
    const store = configureStore({
      reducer: { [api.reducerPath]: api.reducer },
      middleware: (gdm) => gdm().concat(api.middleware),
    })

    const subscription = store.dispatch(
      api.endpoints.getJob.initiate(1, {
        subscriptionOptions: {
          pollingInterval: (entry) => {
            expectTypeOf(entry.queryCacheKey).toEqualTypeOf<QueryCacheKey>()
            return 1000
          },
        },
      }),
    )

    subscription.updateSubscriptionOptions({ pollingInterval: () => 1000 })
  })

  test('the function must return a number', () => {
    api.endpoints.getJob.useQuery(1, {
      // @ts-expect-error
      pollingInterval: () => 'soon',
    })

    api.endpoints.getJob.useQuery(1, {
      // @ts-expect-error
      pollingInterval: () => false,
    })
  })

  test('PollingInterval and SubscriptionOptions take an endpoint definition', () => {
    type JobDefinition = typeof api.endpoints.getJob.Types.QueryDefinition

    const pollingInterval: PollingInterval<JobDefinition> = (entry) =>
      entry.data?.status === 'DONE' ? 0 : 1000

    const options: SubscriptionOptions<JobDefinition> = { pollingInterval }

    api.endpoints.getJob.useQuery(1, options)

    expectTypeOf<SubscriptionOptions['pollingInterval']>().toEqualTypeOf<
      PollingInterval | undefined
    >()
  })
})
