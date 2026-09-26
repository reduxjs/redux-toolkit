import { configureStore } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/query/react'
import { act, render } from '@testing-library/react'
import * as React from 'react'
import { Provider } from 'react-redux'

type Item = { id: number; value: string }

type Mode = 'ok' | 'fail' | 'hang'

function setup() {
  let mode: Mode = 'ok'
  let resolveHang: (() => void) | undefined

  const api = createApi({
    baseQuery: async (id: number) => {
      if (mode === 'fail') return { error: { status: 500, data: 'boom' } }
      if (mode === 'hang') {
        await new Promise<void>((r) => (resolveHang = r))
      }
      return { data: { id, value: `item-${id}` } }
    },
    endpoints: (build) => ({
      item: build.query<Item, number>({ query: (id) => id }),
    }),
  })

  const store = configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (gdm) => gdm().concat(api.middleware),
  })

  const flush = () =>
    act(async () => {
      await new Promise((r) => setTimeout(r, 20))
    })

  return {
    api,
    store,
    flush,
    setMode: (m: Mode) => {
      mode = m
    },
    releaseHang: () => resolveHang?.(),
  }
}

type Snapshot = {
  isSuccess: boolean
  isFetching: boolean
  isError: boolean
  data: Item | undefined
}

describe('useQueryState lastResult handling', () => {
  test('isSuccess stays false during a refetch after an error across unrelated re-renders', async () => {
    const { api, store, flush, setMode, releaseHang } = setup()
    const log: Snapshot[] = []
    let refetch: () => unknown = () => {}
    let bump: () => void = () => {}

    function Comp() {
      const [, setN] = React.useState(0)
      bump = () => setN((n) => n + 1)
      const res = api.endpoints.item.useQuery(1)
      refetch = res.refetch
      log.push({
        isSuccess: res.isSuccess,
        isFetching: res.isFetching,
        isError: res.isError,
        data: res.data,
      })
      return null
    }

    render(
      <Provider store={store}>
        <Comp />
      </Provider>,
    )
    await flush()
    expect(log.at(-1)).toMatchObject({ isSuccess: true, isError: false })

    setMode('fail')
    await act(async () => {
      refetch()
    })
    await flush()
    expect(log.at(-1)).toMatchObject({
      isSuccess: false,
      isError: true,
      data: { id: 1 },
    })

    setMode('hang')
    await act(async () => {
      refetch()
    })
    await flush()
    expect(log.at(-1)).toMatchObject({
      isSuccess: false,
      isFetching: true,
      isError: false,
      data: { id: 1 },
    })

    const rendersBefore = log.length
    await act(async () => {
      bump()
    })
    expect(log.length).toBe(rendersBefore + 1)
    expect(log.at(-1)).toMatchObject({
      isSuccess: false,
      isFetching: true,
      isError: false,
    })

    await act(async () => {
      releaseHang()
    })
    await flush()
    expect(log.at(-1)).toMatchObject({
      isSuccess: true,
      isFetching: false,
      isError: false,
    })
  })

  test('isSuccess is stable even when an inline selectFromResult forces a re-read every render', async () => {
    const { api, store, flush, setMode, releaseHang } = setup()
    const log: Snapshot[] = []
    let refetch: () => unknown = () => {}
    let bump: () => void = () => {}

    function Comp() {
      const [, setN] = React.useState(0)
      bump = () => setN((n) => n + 1)
      const res = api.endpoints.item.useQuery(1, {
        selectFromResult: ({ isSuccess, isFetching, isError, data }) => ({
          isSuccess,
          isFetching,
          isError,
          data,
        }),
      })
      refetch = res.refetch
      log.push({
        isSuccess: res.isSuccess,
        isFetching: res.isFetching,
        isError: res.isError,
        data: res.data,
      })
      return null
    }

    render(
      <Provider store={store}>
        <Comp />
      </Provider>,
    )
    await flush()
    setMode('fail')
    await act(async () => {
      refetch()
    })
    await flush()
    setMode('hang')
    await act(async () => {
      refetch()
    })
    await flush()
    expect(log.at(-1)).toMatchObject({ isSuccess: false, isFetching: true })

    for (let i = 0; i < 3; i++) {
      await act(async () => {
        bump()
      })
      expect(log.at(-1)).toMatchObject({ isSuccess: false, isFetching: true })
    }

    await act(async () => {
      releaseHang()
    })
    await flush()
    expect(log.at(-1)).toMatchObject({ isSuccess: true, isFetching: false })
  })

  test('keeps the previous data while a new arg loads, then switches to the new data', async () => {
    const { api, store, flush, setMode, releaseHang } = setup()
    const log: Snapshot[] = []
    let setId: (id: number) => void = () => {}

    function Comp() {
      const [id, _setId] = React.useState(1)
      setId = _setId
      const res = api.endpoints.item.useQuery(id)
      log.push({
        isSuccess: res.isSuccess,
        isFetching: res.isFetching,
        isError: res.isError,
        data: res.data,
      })
      return null
    }

    render(
      <Provider store={store}>
        <Comp />
      </Provider>,
    )
    await flush()
    expect(log.at(-1)).toMatchObject({
      isSuccess: true,
      isFetching: false,
      data: { id: 1 },
    })

    setMode('hang')
    await act(async () => {
      setId(2)
    })
    await flush()
    expect(log.at(-1)).toMatchObject({
      isSuccess: true,
      isFetching: true,
      data: { id: 1 },
    })

    await act(async () => {
      releaseHang()
    })
    await flush()
    expect(log.at(-1)).toMatchObject({
      isSuccess: true,
      isFetching: false,
      data: { id: 2 },
    })

    // Switching back to a cached arg gives its data immediately, no fetch.
    await act(async () => {
      setId(1)
    })
    expect(log.at(-1)).toMatchObject({
      isSuccess: true,
      isFetching: false,
      data: { id: 1 },
    })
  })

  test('resetApiState resets a mounted hook instead of showing stale data', async () => {
    const { api, store, flush } = setup()
    const log: Snapshot[] = []

    function Comp() {
      const res = api.endpoints.item.useQuery(1)
      log.push({
        isSuccess: res.isSuccess,
        isFetching: res.isFetching,
        isError: res.isError,
        data: res.data,
      })
      return null
    }

    render(
      <Provider store={store}>
        <Comp />
      </Provider>,
    )
    await flush()
    expect(log.at(-1)).toMatchObject({ isSuccess: true, data: { id: 1 } })

    await act(async () => {
      store.dispatch(api.util.resetApiState())
    })
    // The hook re-subscribes and refetches; while doing so it must not report
    // the pre-reset data as a success.
    const afterReset = log.at(-1)!
    expect(afterReset.data).toBeUndefined()
    expect(afterReset.isSuccess).toBe(false)

    await flush()
    expect(log.at(-1)).toMatchObject({ isSuccess: true, data: { id: 1 } })
  })
})
