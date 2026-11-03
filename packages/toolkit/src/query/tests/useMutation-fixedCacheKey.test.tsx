import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react'
import {
  act,
  getByTestId,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { delay } from 'msw'
import { vi } from 'vitest'
import { setupApiStore } from '../../tests/utils/helpers'

describe('fixedCacheKey', () => {
  const onNewCacheEntry = vi.fn()

  const api = createApi({
    async baseQuery(arg: string | Promise<string>) {
      return { data: await arg }
    },
    endpoints: (build) => ({
      send: build.mutation<string, string | Promise<string>>({
        query: (arg) => arg,
      }),
    }),
  })
  const storeRef = setupApiStore(api)

  function Component({
    name,
    fixedCacheKey,
    value = name,
  }: {
    name: string
    fixedCacheKey?: string
    value?: string | Promise<string>
  }) {
    const [trigger, result] = api.endpoints.send.useMutation({ fixedCacheKey })

    return (
      <div data-testid={name}>
        <div data-testid="status">{result.status}</div>
        <div data-testid="data">{result.data}</div>
        <div data-testid="originalArgs">{String(result.originalArgs)}</div>
        <button data-testid="trigger" onClick={() => trigger(value)}>
          trigger
        </button>
        <button data-testid="reset" onClick={result.reset}>
          reset
        </button>
      </div>
    )
  }

  test('two mutations without `fixedCacheKey` do not influence each other', async () => {
    render(
      <>
        <Component name="C1" />
        <Component name="C2" />
      </>,
      { wrapper: storeRef.wrapper },
    )
    const c1 = screen.getByTestId('C1')
    const c2 = screen.getByTestId('C2')
    expect(getByTestId(c1, 'status').textContent).toBe('uninitialized')
    expect(getByTestId(c2, 'status').textContent).toBe('uninitialized')

    act(() => {
      getByTestId(c1, 'trigger').click()
    })

    await waitFor(() =>
      expect(getByTestId(c1, 'status').textContent).toBe('fulfilled'),
    )
    expect(getByTestId(c1, 'data').textContent).toBe('C1')
    expect(getByTestId(c2, 'status').textContent).toBe('uninitialized')
  })

  test('two mutations with the same `fixedCacheKey` do influence each other', async () => {
    render(
      <>
        <Component name="C1" fixedCacheKey="test" />
        <Component name="C2" fixedCacheKey="test" />
      </>,
      { wrapper: storeRef.wrapper },
    )
    const c1 = screen.getByTestId('C1')
    const c2 = screen.getByTestId('C2')
    expect(getByTestId(c1, 'status').textContent).toBe('uninitialized')
    expect(getByTestId(c2, 'status').textContent).toBe('uninitialized')

    act(() => {
      getByTestId(c1, 'trigger').click()
    })

    await waitFor(() => {
      expect(getByTestId(c1, 'status').textContent).toBe('fulfilled')
      expect(getByTestId(c1, 'data').textContent).toBe('C1')
      expect(getByTestId(c2, 'status').textContent).toBe('fulfilled')
      expect(getByTestId(c2, 'data').textContent).toBe('C1')
    })

    // test reset from the other component
    act(() => {
      getByTestId(c2, 'reset').click()
    })
    await waitFor(() => {
      expect(getByTestId(c1, 'status').textContent).toBe('uninitialized')
      expect(getByTestId(c1, 'data').textContent).toBe('')
      expect(getByTestId(c2, 'status').textContent).toBe('uninitialized')
      expect(getByTestId(c2, 'data').textContent).toBe('')
    })
  })

  test('resetting from the component that triggered the mutation resets for each shared result', async () => {
    render(
      <>
        <Component name="C1" fixedCacheKey="test-A" />
        <Component name="C2" fixedCacheKey="test-A" />
        <Component name="C3" fixedCacheKey="test-B" />
        <Component name="C4" fixedCacheKey="test-B" />
      </>,
      { wrapper: storeRef.wrapper },
    )
    const c1 = screen.getByTestId('C1')
    const c2 = screen.getByTestId('C2')
    const c3 = screen.getByTestId('C3')
    const c4 = screen.getByTestId('C4')
    expect(getByTestId(c1, 'status').textContent).toBe('uninitialized')
    expect(getByTestId(c2, 'status').textContent).toBe('uninitialized')
    expect(getByTestId(c3, 'status').textContent).toBe('uninitialized')
    expect(getByTestId(c4, 'status').textContent).toBe('uninitialized')

    // trigger with a component using the first cache key

    act(() => {
      getByTestId(c1, 'trigger').click()
    })

    await waitFor(() =>
      expect(getByTestId(c1, 'status').textContent).toBe('fulfilled'),
    )

    // the components with the first cache key should be affected
    expect(getByTestId(c1, 'data').textContent).toBe('C1')
    expect(getByTestId(c2, 'status').textContent).toBe('fulfilled')
    expect(getByTestId(c2, 'data').textContent).toBe('C1')
    expect(getByTestId(c2, 'status').textContent).toBe('fulfilled')

    // the components with the second cache key should be unaffected
    expect(getByTestId(c3, 'data').textContent).toBe('')
    expect(getByTestId(c3, 'status').textContent).toBe('uninitialized')
    expect(getByTestId(c4, 'data').textContent).toBe('')
    expect(getByTestId(c4, 'status').textContent).toBe('uninitialized')

    // trigger with a component using the second cache key

    act(() => {
      getByTestId(c3, 'trigger').click()
    })

    await waitFor(() =>
      expect(getByTestId(c3, 'status').textContent).toBe('fulfilled'),
    )

    // the components with the first cache key should be unaffected
    await waitFor(() => {
      expect(getByTestId(c1, 'data').textContent).toBe('C1')
      expect(getByTestId(c2, 'status').textContent).toBe('fulfilled')
      expect(getByTestId(c2, 'data').textContent).toBe('C1')
      expect(getByTestId(c2, 'status').textContent).toBe('fulfilled')

      // the component with the second cache key should be affected
      expect(getByTestId(c3, 'data').textContent).toBe('C3')
      expect(getByTestId(c3, 'status').textContent).toBe('fulfilled')
      expect(getByTestId(c4, 'data').textContent).toBe('C3')
      expect(getByTestId(c4, 'status').textContent).toBe('fulfilled')
    })

    // test reset from the component that triggered the mutation for the first cache key

    act(() => {
      getByTestId(c1, 'reset').click()
    })

    await waitFor(() => {
      // the components with the first cache key should be affected
      expect(getByTestId(c1, 'data').textContent).toBe('')
      expect(getByTestId(c1, 'status').textContent).toBe('uninitialized')
      expect(getByTestId(c2, 'data').textContent).toBe('')
      expect(getByTestId(c2, 'status').textContent).toBe('uninitialized')

      // the components with the second cache key should be unaffected
      expect(getByTestId(c3, 'data').textContent).toBe('C3')
      expect(getByTestId(c3, 'status').textContent).toBe('fulfilled')
      expect(getByTestId(c4, 'data').textContent).toBe('C3')
      expect(getByTestId(c4, 'status').textContent).toBe('fulfilled')
    })
  })

  test('two mutations with different `fixedCacheKey` do not influence each other', async () => {
    render(
      <>
        <Component name="C1" fixedCacheKey="test" />
        <Component name="C2" fixedCacheKey="toast" />
      </>,
      { wrapper: storeRef.wrapper },
    )
    const c1 = screen.getByTestId('C1')
    const c2 = screen.getByTestId('C2')
    expect(getByTestId(c1, 'status').textContent).toBe('uninitialized')
    expect(getByTestId(c2, 'status').textContent).toBe('uninitialized')

    act(() => {
      getByTestId(c1, 'trigger').click()
    })

    await waitFor(() =>
      expect(getByTestId(c1, 'status').textContent).toBe('fulfilled'),
    )
    expect(getByTestId(c1, 'data').textContent).toBe('C1')
    expect(getByTestId(c2, 'status').textContent).toBe('uninitialized')
  })

  test('unmounting and remounting keeps data intact', async () => {
    const { rerender } = render(<Component name="C1" fixedCacheKey="test" />, {
      wrapper: storeRef.wrapper,
    })
    let c1 = screen.getByTestId('C1')
    expect(getByTestId(c1, 'status').textContent).toBe('uninitialized')

    act(() => {
      getByTestId(c1, 'trigger').click()
    })

    await waitFor(() =>
      expect(getByTestId(c1, 'status').textContent).toBe('fulfilled'),
    )
    expect(getByTestId(c1, 'data').textContent).toBe('C1')

    rerender(<div />)
    expect(screen.queryByTestId('C1')).toBe(null)

    rerender(<Component name="C1" fixedCacheKey="test" />)
    c1 = screen.getByTestId('C1')
    expect(getByTestId(c1, 'status').textContent).toBe('fulfilled')
    expect(getByTestId(c1, 'data').textContent).toBe('C1')
  })

  test('(limitation) mutations using `fixedCacheKey` do not return `originalArgs`', async () => {
    render(
      <>
        <Component name="C1" fixedCacheKey="test" />
        <Component name="C2" fixedCacheKey="test" />
      </>,
      { wrapper: storeRef.wrapper },
    )
    const c1 = screen.getByTestId('C1')
    const c2 = screen.getByTestId('C2')
    expect(getByTestId(c1, 'status').textContent).toBe('uninitialized')
    expect(getByTestId(c2, 'status').textContent).toBe('uninitialized')

    act(() => {
      getByTestId(c1, 'trigger').click()
    })

    await waitFor(() =>
      expect(getByTestId(c1, 'status').textContent).toBe('fulfilled'),
    )
    expect(getByTestId(c1, 'data').textContent).toBe('C1')
    expect(getByTestId(c2, 'status').textContent).toBe('fulfilled')
    expect(getByTestId(c2, 'data').textContent).toBe('C1')
  })

  test('a component without `fixedCacheKey` has `originalArgs`', async () => {
    render(<Component name="C1" />, {
      wrapper: storeRef.wrapper,
    })
    let c1 = screen.getByTestId('C1')
    expect(getByTestId(c1, 'status').textContent).toBe('uninitialized')
    expect(getByTestId(c1, 'originalArgs').textContent).toBe('undefined')

    await act(async () => {
      getByTestId(c1, 'trigger').click()
      await Promise.resolve()
    })

    expect(getByTestId(c1, 'originalArgs').textContent).toBe('C1')
  })

  test('a component with `fixedCacheKey` does never have `originalArgs`', async () => {
    render(<Component name="C1" fixedCacheKey="test" />, {
      wrapper: storeRef.wrapper,
    })
    let c1 = screen.getByTestId('C1')
    expect(getByTestId(c1, 'status').textContent).toBe('uninitialized')
    expect(getByTestId(c1, 'originalArgs').textContent).toBe('undefined')

    await act(async () => {
      getByTestId(c1, 'trigger').click()
    })

    expect(getByTestId(c1, 'originalArgs').textContent).toBe('undefined')
  })

  test('using `fixedCacheKey` will always use the latest dispatched thunk, prevent races', async () => {
    let resolve1: (str: string) => void, resolve2: (str: string) => void
    const p1 = new Promise<string>((resolve) => {
      resolve1 = resolve
    })
    const p2 = new Promise<string>((resolve) => {
      resolve2 = resolve
    })
    render(
      <>
        <Component name="C1" fixedCacheKey="test" value={p1} />
        <Component name="C2" fixedCacheKey="test" value={p2} />
      </>,
      { wrapper: storeRef.wrapper },
    )
    const c1 = screen.getByTestId('C1')
    const c2 = screen.getByTestId('C2')
    expect(getByTestId(c1, 'status').textContent).toBe('uninitialized')
    expect(getByTestId(c2, 'status').textContent).toBe('uninitialized')

    await act(async () => {
      getByTestId(c1, 'trigger').click()
      await Promise.resolve()
    })

    expect(getByTestId(c1, 'status').textContent).toBe('pending')
    expect(getByTestId(c1, 'data').textContent).toBe('')

    act(() => {
      getByTestId(c2, 'trigger').click()
    })

    expect(getByTestId(c1, 'status').textContent).toBe('pending')
    expect(getByTestId(c1, 'data').textContent).toBe('')

    await act(async () => {
      resolve1!('this should not show up any more')
      await Promise.resolve()
    })

    await delay(150)

    expect(getByTestId(c1, 'status').textContent).toBe('pending')
    expect(getByTestId(c1, 'data').textContent).toBe('')

    await act(async () => {
      resolve2!('this should be visible')
      await Promise.resolve()
    })

    await delay(150)

    expect(getByTestId(c1, 'status').textContent).toBe('fulfilled')
    expect(getByTestId(c1, 'data').textContent).toBe('this should be visible')
  })

  test('using fixedCacheKey should create a new cache entry', async () => {
    api.enhanceEndpoints({
      endpoints: {
        send: {
          onCacheEntryAdded: (arg) => onNewCacheEntry(arg),
        },
      },
    })

    render(<Component name="C1" fixedCacheKey={'testKey'} />, {
      wrapper: storeRef.wrapper,
    })

    let c1 = screen.getByTestId('C1')

    expect(getByTestId(c1, 'status').textContent).toBe('uninitialized')
    expect(getByTestId(c1, 'originalArgs').textContent).toBe('undefined')

    await act(async () => {
      getByTestId(c1, 'trigger').click()
      await Promise.resolve()
    })

    expect(onNewCacheEntry).toHaveBeenCalledWith('C1')

    api.enhanceEndpoints({
      endpoints: {
        send: {
          onCacheEntryAdded: undefined,
        },
      },
    })
  })
})

describe('fixedCacheKey shared by several mutation calls', () => {
  function createGate() {
    const waiting: (() => void)[] = []
    return {
      wait: () => new Promise<void>((resolve) => waiting.push(resolve)),
      releaseOldest: () => waiting.shift()?.(),
    }
  }

  test('a mutation replaced in state by a newer call still invalidates its own tags', async () => {
    const gate = createGate()
    let aCount = 0
    let bCount = 0
    const api = createApi({
      baseQuery: fakeBaseQuery(),
      tagTypes: ['A', 'B'],
      endpoints: (build) => ({
        providesA: build.query<number, void>({
          queryFn: () => ({ data: ++aCount }),
          providesTags: ['A'],
        }),
        providesB: build.query<number, void>({
          queryFn: () => ({ data: ++bCount }),
          providesTags: ['B'],
        }),
        update: build.mutation<string, 'A' | 'B'>({
          queryFn: async (which) => {
            await gate.wait()
            return { data: which }
          },
          invalidatesTags: (_result, _error, which) => [which],
        }),
      }),
    })
    const { store } = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })

    store.dispatch(api.endpoints.providesA.initiate())
    store.dispatch(api.endpoints.providesB.initiate())
    await delay(1)

    const first = store.dispatch(
      api.endpoints.update.initiate('A', { fixedCacheKey: 'shared' }),
    )
    const second = store.dispatch(
      api.endpoints.update.initiate('B', { fixedCacheKey: 'shared' }),
    )
    expect(store.getState().api.mutations.shared?.requestId).toBe(
      second.requestId,
    )

    gate.releaseOldest()
    gate.releaseOldest()
    await Promise.all([first, second])
    await delay(5)

    expect(store.getState().api.mutations.shared?.data).toBe('B')
    expect(aCount).toBe(2)
    expect(bCount).toBe(2)
  })

  function setupLifecycleApi() {
    let started = 0
    let cacheEntriesAdded = 0
    const removed: number[] = []
    const api = createApi({
      baseQuery: fakeBaseQuery(),
      endpoints: (build) => ({
        update: build.mutation<null, void>({
          queryFn: () => ({ data: null }),
          onQueryStarted() {
            started++
          },
          async onCacheEntryAdded(_, { cacheEntryRemoved }) {
            const index = ++cacheEntriesAdded
            await cacheEntryRemoved
            removed.push(index)
          },
        }),
      }),
    })
    const { store } = setupApiStore(api, undefined, {
      withoutTestLifecycles: true,
    })
    const triggerTwiceThenReset = async () => {
      for (let i = 0; i < 2; i++) {
        await store.dispatch(
          api.endpoints.update.initiate(undefined, { fixedCacheKey: 'shared' }),
        )
      }
      await delay(1)
      store.dispatch(api.util.resetApiState())
      await delay(1)
    }
    return {
      triggerTwiceThenReset,
      counts: () => ({ started, cacheEntriesAdded, removed }),
    }
  }

  test('every call runs onQueryStarted and onCacheEntryAdded', async () => {
    const { triggerTwiceThenReset, counts } = setupLifecycleApi()
    await triggerTwiceThenReset()

    // Re-triggering ends the previous lifecycle, so both entries are removed (#5539)
    expect(counts()).toEqual({
      started: 2,
      cacheEntriesAdded: 2,
      removed: [1, 2],
    })
  })

  // https://github.com/reduxjs/redux-toolkit/issues/5539
  test('every started cache lifecycle gets cacheEntryRemoved', async () => {
    const { triggerTwiceThenReset, counts } = setupLifecycleApi()
    await triggerTwiceThenReset()

    const { cacheEntriesAdded, removed } = counts()
    expect(removed).toHaveLength(cacheEntriesAdded)
  })
})
