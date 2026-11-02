import { configureStore, type Store } from '@reduxjs/toolkit'
import {
  buildCreateApi,
  coreModule,
  createApi,
  reactHooksModule,
} from '@reduxjs/toolkit/query/react'
import { act, render, renderHook, waitFor } from '@testing-library/react'
import * as React from 'react'
import { Provider } from 'react-redux'

import { getSubscriptionSelectors } from '@internal/tests/utils/helpers'

type Call = { arg: string; signal: AbortSignal }

function makeCountingApi(create: any = createApi) {
  const calls: Call[] = []
  const api = create({
    baseQuery: (arg: string, queryApi: any) => {
      calls.push({ arg, signal: queryApi.signal })
      return new Promise<{ data: string }>((resolve) => {
        setTimeout(() => resolve({ data: arg }), 25)
      })
    },
    endpoints: (build: any) => ({
      getPost: build.query({
        query: (id: number) => `/post/${id}`,
      }),
    }),
  })
  return { api, calls }
}

function makeStoreFor(api: any) {
  return configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (gdm) =>
      gdm({ serializableCheck: false, immutableCheck: false }).concat(
        api.middleware,
      ),
  })
}

const subCount = (api: any, store: Store, key: string) =>
  getSubscriptionSelectors(api, store.dispatch).getSubscriptionCount(key)

function makeCountingInfiniteApi() {
  const calls: Call[] = []
  const api = createApi({
    baseQuery: (arg: string, queryApi: any) => {
      calls.push({ arg, signal: queryApi.signal })
      return new Promise<{ data: string }>((resolve) => {
        setTimeout(() => resolve({ data: arg }), 25)
      })
    },
    endpoints: (build: any) => ({
      getPages: build.infiniteQuery({
        infiniteQueryOptions: {
          initialPageParam: 0,
          getNextPageParam: (_l: any, _a: any, last: number) => last + 1,
        },
        query: ({ pageParam }: { pageParam: number }) => `/pages/${pageParam}`,
      }),
    }),
  })
  return { api, calls }
}

describe('store-swap effect edge cases', () => {
  test('a lazy trigger fired from a layout effect during the swap commit is not unsubscribed', async () => {
    const { api, calls } = makeCountingApi()
    const storeA = makeStoreFor(api)
    const storeB = makeStoreFor(api)
    let currentStore = storeA

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={currentStore}>{children}</Provider>
    )

    let captured: { requestId: string } | undefined
    const { result, rerender } = renderHook(
      () => {
        const [trigger, res] = api.endpoints.getPost.useLazyQuery()
        // Consumer pattern: re-fire the trigger whenever its identity changes
        // (the trigger is rebound when the Provider store changes).
        React.useLayoutEffect(() => {
          captured = trigger(7)
        }, [trigger])
        return res
      },
      { wrapper: Wrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(calls.length).toBe(1)
    expect(subCount(api, storeA, 'getPost(7)')).toBe(1)

    currentStore = storeB
    rerender()

    await waitFor(() => expect(result.current.isSuccess).toBe(true), {
      timeout: 3000,
    })

    // Exactly one fetch against storeB (the consumer's own trigger), and the
    // promise the consumer received must still own a live subscription.
    // Bug: the store-swap effect unsubscribes that new-store promise. The
    // fetch itself still completes and the reinstate effect re-subscribes
    // under a different requestId, so fetch/subscription counts look fine -
    // but the consumer's own promise has lost its subscription.
    expect(calls.length).toBe(2)
    expect(subCount(api, storeB, 'getPost(7)')).toBe(1)
    expect(subCount(api, storeA, 'getPost(7)')).toBe(0)
    expect(captured).toBeDefined()
    const selectors = getSubscriptionSelectors(api, storeB.dispatch)
    expect(
      selectors.isRequestSubscribed('getPost(7)', captured!.requestId),
    ).toBe(true)
  })

  test('render mode: an abandoned swap render must not clear the committed lazy subscription', async () => {
    const customCreateApi = buildCreateApi(
      coreModule(),
      reactHooksModule({ unstable__sideEffectsInRender: true }),
    )
    const { api, calls } = makeCountingApi(customCreateApi)
    const storeA = makeStoreFor(api)
    const storeB = makeStoreFor(api)

    let shouldSuspend = false
    let suspendPromise: Promise<void> | null = null
    let resolveSuspend: (() => void) | undefined

    function Suspender(): null {
      if (shouldSuspend) {
        if (!suspendPromise) {
          suspendPromise = new Promise<void>((r) => {
            resolveSuspend = r
          })
        }
        throw suspendPromise
      }
      return null
    }

    function HookUser(): null {
      const [trigger] = api.endpoints.getPost.useLazyQuery()
      React.useEffect(() => {
        trigger(3)
      }, [trigger])
      return null
    }

    function App({ store }: { store: Store }) {
      return (
        <Provider store={store}>
          <HookUser />
          <React.Suspense fallback={null}>
            <Suspender />
          </React.Suspense>
        </Provider>
      )
    }

    const view = render(<App store={storeA} />)
    await waitFor(() => expect(calls.length).toBe(1))
    expect(subCount(api, storeA, 'getPost(3)')).toBe(1)

    await act(async () => {
      React.startTransition(() => {
        shouldSuspend = true
        view.rerender(<App store={storeB} />)
      })
    })

    // The transition is suspended, so the committed tree is still on storeA.
    // A commit-gated swap effect must not have touched storeA's subscription.
    // Bug (render-phase swap effect): the abandoned render already unsubscribed
    // storeA's promise, and the lazy recovery effect only runs on commit.
    expect(subCount(api, storeA, 'getPost(3)')).toBe(1)
    expect(calls.length).toBe(1)

    shouldSuspend = false
    await act(async () => {
      resolveSuspend?.()
    })

    // After the commit, the hook re-triggers against storeB exactly once.
    await waitFor(() => expect(calls.length).toBe(2))
    await waitFor(() => expect(subCount(api, storeB, 'getPost(3)')).toBe(1))
    expect(subCount(api, storeA, 'getPost(3)')).toBe(0)
  })

  test('render mode: an abandoned swap render must not clear the committed useQuery subscription', async () => {
    const customCreateApi = buildCreateApi(
      coreModule(),
      reactHooksModule({ unstable__sideEffectsInRender: true }),
    )
    const { api, calls } = makeCountingApi(customCreateApi)
    const storeA = makeStoreFor(api)
    const storeB = makeStoreFor(api)

    let shouldSuspend = false
    let suspendPromise: Promise<void> | null = null
    let resolveSuspend: (() => void) | undefined

    function Suspender(): null {
      if (shouldSuspend) {
        if (!suspendPromise) {
          suspendPromise = new Promise<void>((r) => {
            resolveSuspend = r
          })
        }
        throw suspendPromise
      }
      return null
    }

    function HookUser(): null {
      api.endpoints.getPost.useQuery(3)
      return null
    }

    function App({ store }: { store: Store }) {
      return (
        <Provider store={store}>
          <HookUser />
          <React.Suspense fallback={null}>
            <Suspender />
          </React.Suspense>
        </Provider>
      )
    }

    const view = render(<App store={storeA} />)
    await waitFor(() => expect(calls.length).toBe(1))
    expect(subCount(api, storeA, 'getPost(3)')).toBe(1)

    await act(async () => {
      React.startTransition(() => {
        shouldSuspend = true
        view.rerender(<App store={storeB} />)
      })
    })

    // The transition is suspended, so the committed tree is still on storeA
    // and its subscription must survive. (In sideEffectsInRender mode the
    // subscription effect may already have initiated against storeB during
    // the uncommitted render - that is the documented trade-off of the flag
    // and not asserted here.)
    // Bug: the common store-swap effect runs during render and unsubscribes
    // the committed storeA promise before the swap commits.
    expect(subCount(api, storeA, 'getPost(3)')).toBe(1)

    shouldSuspend = false
    await act(async () => {
      resolveSuspend?.()
    })

    // After the commit, the previous store's promise is unsubscribed and the
    // hook is subscribed against storeB.
    await waitFor(() => expect(subCount(api, storeB, 'getPost(3)')).toBe(1))
    expect(subCount(api, storeA, 'getPost(3)')).toBe(0)
  })

  test('a fetchNextPage fired from a layout effect during the swap commit keeps its subscription', async () => {
    const { api } = makeCountingInfiniteApi()
    const storeA = makeStoreFor(api)
    const storeB = makeStoreFor(api)
    // Pre-seed storeB with page 0 so fetchNextPage has a page to continue
    // from after the swap.
    await storeB.dispatch(
      api.endpoints.getPages.initiate('arg', { initialPageParam: 0 }) as any,
    )

    let currentStore = storeA
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={currentStore}>{children}</Provider>
    )

    let captured: { requestId: string; queryCacheKey: string } | undefined
    const { result, rerender } = renderHook(
      () => {
        const { fetchNextPage, ...rest } = (
          api.endpoints.getPages as any
        ).useInfiniteQuery('arg')
        const firstRef = React.useRef(true)
        // Consumer pattern: load the next page from a layout effect whenever
        // fetchNextPage is rebound (it is rebound when the store changes).
        React.useLayoutEffect(() => {
          if (firstRef.current) {
            firstRef.current = false
            return
          }
          captured = fetchNextPage()
        }, [fetchNextPage])
        return rest
      },
      { wrapper: Wrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    currentStore = storeB
    rerender()

    await waitFor(() => expect(result.current.data?.pages.length).toBe(2), {
      timeout: 3000,
    })

    // The fetchNextPage promise was created against storeB between render and
    // the passive swap cleanup. The swap cleanup must only clear the promise
    // from the previous store - the consumer's page-2 subscription must live.
    // Bug: the swap effect clears and unsubscribes whatever promiseRef holds
    // at that moment, including this new storeB promise. The page-2 fetch
    // itself still completes (unsubscribe does not abort), so the pages
    // assertion above passes either way.
    expect(captured).toBeDefined()
    const selectors = getSubscriptionSelectors(api, storeB.dispatch)
    expect(
      selectors.isRequestSubscribed(
        captured!.queryCacheKey,
        captured!.requestId,
      ),
    ).toBe(true)
  })

  test('render mode: unmounting during a suspended swap cleans up both stores', async () => {
    const customCreateApi = buildCreateApi(
      coreModule(),
      reactHooksModule({ unstable__sideEffectsInRender: true }),
    )
    const { api, calls } = makeCountingApi(customCreateApi)
    const storeA = makeStoreFor(api)
    const storeB = makeStoreFor(api)

    let shouldSuspend = false
    let suspendPromise: Promise<void> | null = null

    function Suspender(): null {
      if (shouldSuspend) {
        if (!suspendPromise) {
          suspendPromise = new Promise<void>(() => {})
        }
        throw suspendPromise
      }
      return null
    }

    function HookUser(): null {
      api.endpoints.getPost.useQuery(3)
      return null
    }

    function App({ store }: { store: Store }) {
      return (
        <Provider store={store}>
          <HookUser />
          <React.Suspense fallback={null}>
            <Suspender />
          </React.Suspense>
        </Provider>
      )
    }

    const view = render(<App store={storeA} />)
    await waitFor(() => expect(calls.length).toBe(1))
    expect(subCount(api, storeA, 'getPost(3)')).toBe(1)

    await act(async () => {
      React.startTransition(() => {
        shouldSuspend = true
        view.rerender(<App store={storeB} />)
      })
    })

    // Suspended: committed tree still on storeA, its subscription must live.
    expect(subCount(api, storeA, 'getPost(3)')).toBe(1)

    // Unmount while the swap is still suspended: every subscription the hook
    // ever created must be released - both the committed storeA one and any
    // promise created against storeB by the uncommitted render.
    view.unmount()
    expect(subCount(api, storeA, 'getPost(3)')).toBe(0)
    expect(subCount(api, storeB, 'getPost(3)')).toBe(0)
  })

  test('render mode: a swap render abandoned back to storeA must not leak subscriptions', async () => {
    const customCreateApi = buildCreateApi(
      coreModule(),
      reactHooksModule({ unstable__sideEffectsInRender: true }),
    )
    const { api, calls } = makeCountingApi(customCreateApi)
    const storeA = makeStoreFor(api)
    const storeB = makeStoreFor(api)

    let shouldSuspend = false
    let suspendPromise: Promise<void> | null = null

    function Suspender(): null {
      if (shouldSuspend) {
        if (!suspendPromise) {
          suspendPromise = new Promise<void>(() => {})
        }
        throw suspendPromise
      }
      return null
    }

    function HookUser(): null {
      api.endpoints.getPost.useQuery(3)
      return null
    }

    function App({ store }: { store: Store }) {
      return (
        <Provider store={store}>
          <HookUser />
          <React.Suspense fallback={null}>
            <Suspender />
          </React.Suspense>
        </Provider>
      )
    }

    const view = render(<App store={storeA} />)
    await waitFor(() => expect(calls.length).toBe(1))
    expect(subCount(api, storeA, 'getPost(3)')).toBe(1)

    // Abandoned swap render towards storeB.
    await act(async () => {
      React.startTransition(() => {
        shouldSuspend = true
        view.rerender(<App store={storeB} />)
      })
    })
    expect(subCount(api, storeA, 'getPost(3)')).toBe(1)

    // Come back to storeA with the suspense lifted, still the same mounted
    // hook. The hook must hold exactly one storeA subscription and none on
    // storeB: every promise the abandoned render left behind is stale and
    // must have been flushed by the time the return render commits.
    shouldSuspend = false
    await act(async () => {
      view.rerender(<App store={storeA} />)
    })
    expect(subCount(api, storeA, 'getPost(3)')).toBe(1)
    expect(subCount(api, storeB, 'getPost(3)')).toBe(0)

    view.unmount()
    expect(subCount(api, storeA, 'getPost(3)')).toBe(0)
    expect(subCount(api, storeB, 'getPost(3)')).toBe(0)
  })
})
