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
})
