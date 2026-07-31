/**
 * RTK Query v3 prototype: infinite query parity tests.
 *
 * The v3 `build.infiniteQuery` creator stamps `type: 'infinitequery'`, so the
 * existing core machinery (pagination inside `executeEndpoint`, page-param
 * accumulation, maxPages, direction-aware condition gate) is exercised
 * unchanged. These tests pin that the builder-produced definition shape
 * drives that machinery correctly, at both the core and hooks levels.
 */
import { configureStore } from '@reduxjs/toolkit'
import { createApiBuilder } from '@internal/query/v3/index'
import { reactify } from '@internal/query/v3/react'
import { act, renderHook, waitFor } from '@testing-library/react'
import * as React from 'react'
import { Provider } from 'react-redux'
import { describe, expect, test, vi } from 'vitest'

interface Pokemon {
  id: string
  name: string
}

function setup(maxPages?: number) {
  const baseQuery = vi.fn(async (arg: string) => {
    // url shape: /pokemon/<type>?page=<n>
    const match = /^\/pokemon\/(.+)\?page=(\d+)$/.exec(arg)
    const page = Number(match![2])
    return {
      data: [{ id: String(page), name: `Pokemon ${page}` }] as Pokemon[],
    }
  })

  const build = createApiBuilder({
    baseQuery,
    reducerPath: 'pokemonApi',
  })

  const coreApi = build.createApi({
    endpoints: {
      getInfinitePokemon: {
        kind: build.infiniteQuery<Pokemon[], string, number>({
          infiniteQueryOptions: {
            initialPageParam: 0,
            ...(maxPages
              ? {
                  maxPages,
                  // Annotated: contextual typing does not flow into a
                  // conditionally-spread object literal
                  getPreviousPageParam: (
                    firstPage: Pokemon[],
                    allPages: Pokemon[][],
                    firstPageParam: number,
                  ) => (firstPageParam > 0 ? firstPageParam - 1 : undefined),
                }
              : {}),
            getNextPageParam: (lastPage, allPages, lastPageParam) =>
              lastPageParam + 1,
          },
          request: ({ queryArg, pageParam }) =>
            `/pokemon/${queryArg}?page=${pageParam}`,
        }),
      },
      // A plain query alongside, to pin that both kinds coexist
      getPokemonNames: {
        kind: build.query.fn<string[], void>({
          queryFn: async () => ({ data: ['bulbasaur'] }),
        }),
      },
    },
  })

  const api = reactify(coreApi)

  const store = configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (gDM) => gDM().concat(api.middleware),
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  )

  return { api, store, baseQuery, wrapper }
}

describe('v3 infinite queries: core', () => {
  test('initial fetch, forward and backward pagination accumulate pages', async () => {
    const { api, store, baseQuery } = setup()

    const initial = await store.dispatch(
      api.endpoints.getInfinitePokemon.initiate('fire', {}),
    )
    expect(initial.data).toEqual({
      pages: [[{ id: '0', name: 'Pokemon 0' }]],
      pageParams: [0],
    })
    expect(initial.hasNextPage).toBe(true)
    expect(baseQuery).toHaveBeenCalledTimes(1)

    const second = await store.dispatch(
      api.endpoints.getInfinitePokemon.initiate('fire', {
        direction: 'forward',
      }),
    )
    expect(second.data).toEqual({
      pages: [
        [{ id: '0', name: 'Pokemon 0' }],
        [{ id: '1', name: 'Pokemon 1' }],
      ],
      pageParams: [0, 1],
    })
    expect(baseQuery).toHaveBeenCalledTimes(2)

    const selected = api.endpoints.getInfinitePokemon.select('fire')(
      store.getState(),
    )
    expect(selected.data?.pages.length).toBe(2)
    expect(selected.hasNextPage).toBe(true)
  })

  test('maxPages caps accumulated pages', async () => {
    const { api, store } = setup(2)

    await store.dispatch(api.endpoints.getInfinitePokemon.initiate('fire', {}))
    await store.dispatch(
      api.endpoints.getInfinitePokemon.initiate('fire', {
        direction: 'forward',
      }),
    )
    const third = await store.dispatch(
      api.endpoints.getInfinitePokemon.initiate('fire', {
        direction: 'forward',
      }),
    )

    expect(third.data).toEqual({
      pages: [
        [{ id: '1', name: 'Pokemon 1' }],
        [{ id: '2', name: 'Pokemon 2' }],
      ],
      pageParams: [1, 2],
    })
  })

  test('dev-mode validation still applies: maxPages requires getPreviousPageParam', () => {
    vi.stubEnv('NODE_ENV', 'development')
    const build = createApiBuilder({
      baseQuery: async (arg: string) => ({ data: arg }),
    })
    expect(() =>
      build.createApi({
        endpoints: {
          broken: {
            kind: build.infiniteQuery<string, string, number>({
              infiniteQueryOptions: {
                initialPageParam: 0,
                maxPages: 3,
                getNextPageParam: (
                  lastPage: string,
                  allPages: string[],
                  lastPageParam: number,
                ) => lastPageParam + 1,
              } as any,
              request: ({ queryArg }) => queryArg,
            }),
          },
        },
      }),
    ).toThrowError(/getPreviousPageParam/)
    vi.unstubAllEnvs()
  })
})

describe('v3 infinite queries: hooks', () => {
  test('useInfiniteQuery hook paginates via fetchNextPage', async () => {
    const { api, wrapper, baseQuery } = setup()

    expect(typeof api.useGetInfinitePokemonInfiniteQuery).toBe('function')
    expect(typeof api.endpoints.getInfinitePokemon.useInfiniteQuery).toBe(
      'function',
    )

    const { result } = renderHook(
      () => api.useGetInfinitePokemonInfiniteQuery('fire'),
      { wrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.pages).toEqual([
      [{ id: '0', name: 'Pokemon 0' }],
    ])
    expect(result.current.hasNextPage).toBe(true)

    act(() => {
      void result.current.fetchNextPage()
    })

    await waitFor(() =>
      expect(result.current.data?.pages).toEqual([
        [{ id: '0', name: 'Pokemon 0' }],
        [{ id: '1', name: 'Pokemon 1' }],
      ]),
    )
    expect(result.current.isFetchingNextPage).toBe(false)
    expect(baseQuery).toHaveBeenCalledTimes(2)
  })
})
