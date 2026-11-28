import { configureStore } from '@reduxjs/toolkit'
import type {
  InfiniteData,
  UpdateQueryDataOptions,
  UpsertQueryDataOptions,
} from '@reduxjs/toolkit/query'
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query'
import type {
  UpdateQueryDataOptions as ReactUpdateOptions,
  UpsertQueryDataOptions as ReactUpsertOptions,
} from '@reduxjs/toolkit/query/react'

type Post = { id: number; title: string }

const api = createApi({
  baseQuery: fakeBaseQuery(),
  endpoints: (build) => ({
    post: build.query<Post, number>({
      queryFn: (id) => ({ data: { id, title: 'post' } }),
    }),
    pages: build.infiniteQuery<Post, string, number>({
      infiniteQueryOptions: {
        initialPageParam: 0,
        getNextPageParam: (_, __, last) => last + 1,
      },
      queryFn: ({ pageParam }) => ({
        data: { id: pageParam, title: 'page' },
      }),
    }),
    save: build.mutation<Post, Post>({
      queryFn: (post) => ({ data: post }),
    }),
  }),
})
const store = configureStore({
  reducer: { [api.reducerPath]: api.reducer },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
})

test('preserves update signatures and recipe inference', () => {
  const options: UpdateQueryDataOptions = {
    updateProvided: false,
    ignoreEarlierFetches: true,
  }
  expectTypeOf<ReactUpdateOptions>().toEqualTypeOf<UpdateQueryDataOptions>()
  for (const value of [undefined, false, true, {}, options]) {
    const patch = store.dispatch(
      api.util.updateQueryData(
        'post',
        1,
        (draft) => {
          expectTypeOf(draft.id).toBeNumber()
          expectTypeOf(draft.title).toBeString()
          draft.title = 'updated'
        },
        value,
      ),
    )
    patch.undo()
    patch.undo({ ifUnchanged: true })
    Promise.reject().catch(patch.undo)
  }

  // @ts-expect-error the query argument remains a number
  api.util.updateQueryData('post', '1', () => {}, options)
  // @ts-expect-error mutation endpoints cannot be updated
  api.util.updateQueryData('save', { id: 1, title: '' }, () => {}, options)
  // @ts-expect-error raw patching has no new public options argument
  api.util.patchQueryData('post', 1, [], true, options)
})

test('preserves upsert values, arguments and promise results', () => {
  const options: UpsertQueryDataOptions = { ignoreEarlierFetches: true }
  expectTypeOf<ReactUpsertOptions>().toEqualTypeOf<UpsertQueryDataOptions>()
  const result = store.dispatch(
    api.util.upsertQueryData('post', 1, { id: 1, title: 'post' }, options),
  )
  expectTypeOf(result.unwrap()).resolves.toEqualTypeOf<Post>()
  // @ts-expect-error the query argument remains a number
  api.util.upsertQueryData('post', '1', { id: 1, title: 'post' }, options)
  // @ts-expect-error the result must match the endpoint
  api.util.upsertQueryData('post', 1, { id: 1 }, options)
  api.util.upsertQueryData(
    'post',
    1,
    { id: 1, title: '' },
    // @ts-expect-error this option is only supported by updateQueryData
    { updateProvided: true },
  )
})

test('supports infinite query values and updater inference', () => {
  store.dispatch(
    api.util.updateQueryData(
      'pages',
      'arg',
      (draft) => {
        expectTypeOf(draft.pages).toEqualTypeOf<Post[]>()
        expectTypeOf(draft.pageParams).toEqualTypeOf<number[]>()
      },
      { ignoreEarlierFetches: true },
    ),
  )
  const result = store.dispatch(
    api.util.upsertQueryData(
      'pages',
      'arg',
      { pages: [{ id: 1, title: 'page' }], pageParams: [0] },
      { ignoreEarlierFetches: true },
    ),
  )
  expectTypeOf(result.unwrap()).resolves.toEqualTypeOf<
    InfiniteData<Post, number>
  >()
})
