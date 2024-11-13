import type { PatchCollection, Recipe } from '@internal/query/core/buildThunks'
import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit'
import type {
  FetchBaseQueryError,
  FetchBaseQueryMeta,
  RootState,
  TypedOnQueryStarted,
} from '@reduxjs/toolkit/query'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query'

const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: 'https://example.com' }),
  endpoints: () => ({}),
})

describe('type tests', () => {
  test(`mutation: onStart and onSuccess`, async () => {
    const extended = api.injectEndpoints({
      overrideExisting: true,
      endpoints: (build) => ({
        injected: build.mutation<number, string>({
          query: () => '/success',
          async onQueryStarted(arg, { queryFulfilled }) {
            // awaiting without catching like this would result in an `unhandledRejection` exception if there was an error
            // unfortunately we cannot test for that in jest.
            const result = await queryFulfilled

            expectTypeOf(result).toMatchTypeOf<{
              data: number
              meta?: FetchBaseQueryMeta
            }>()
          },
        }),
      }),
    })
  })

  test('query types', () => {
    const extended = api.injectEndpoints({
      overrideExisting: true,
      endpoints: (build) => ({
        injected: build.query<number, string>({
          query: () => '/success',
          async onQueryStarted(arg, { queryFulfilled }) {
            queryFulfilled.then(
              (result) => {
                expectTypeOf(result).toMatchTypeOf<{
                  data: number
                  meta?: FetchBaseQueryMeta
                }>()
              },
              (reason) => {
                if (reason.isUnhandledError) {
                  expectTypeOf(reason).toEqualTypeOf<{
                    error: unknown
                    meta?: undefined
                    isUnhandledError: true
                  }>()
                } else {
                  expectTypeOf(reason).toEqualTypeOf<{
                    error: FetchBaseQueryError
                    isUnhandledError: false
                    meta: FetchBaseQueryMeta | undefined
                  }>()
                }
              },
            )

            queryFulfilled.catch((reason) => {
              if (reason.isUnhandledError) {
                expectTypeOf(reason).toEqualTypeOf<{
                  error: unknown
                  meta?: undefined
                  isUnhandledError: true
                }>()
              } else {
                expectTypeOf(reason).toEqualTypeOf<{
                  error: FetchBaseQueryError
                  isUnhandledError: false
                  meta: FetchBaseQueryMeta | undefined
                }>()
              }
            })

            const result = await queryFulfilled

            expectTypeOf(result).toMatchTypeOf<{
              data: number
              meta?: FetchBaseQueryMeta
            }>()
          },
        }),
      }),
    })
  })

  test('mutation types', () => {
    const extended = api.injectEndpoints({
      overrideExisting: true,
      endpoints: (build) => ({
        injected: build.query<number, string>({
          query: () => '/success',
          async onQueryStarted(arg, { queryFulfilled }) {
            queryFulfilled.then(
              (result) => {
                expectTypeOf(result).toMatchTypeOf<{
                  data: number
                  meta?: FetchBaseQueryMeta
                }>()
              },
              (reason) => {
                if (reason.isUnhandledError) {
                  expectTypeOf(reason).toEqualTypeOf<{
                    error: unknown
                    meta?: undefined
                    isUnhandledError: true
                  }>()
                } else {
                  expectTypeOf(reason).toEqualTypeOf<{
                    error: FetchBaseQueryError
                    isUnhandledError: false
                    meta: FetchBaseQueryMeta | undefined
                  }>()
                }
              },
            )

            queryFulfilled.catch((reason) => {
              if (reason.isUnhandledError) {
                expectTypeOf(reason).toEqualTypeOf<{
                  error: unknown
                  meta?: undefined
                  isUnhandledError: true
                }>()
              } else {
                expectTypeOf(reason).toEqualTypeOf<{
                  error: FetchBaseQueryError
                  isUnhandledError: false
                  meta: FetchBaseQueryMeta | undefined
                }>()
              }
            })

            const result = await queryFulfilled

            expectTypeOf(result).toMatchTypeOf<{
              data: number
              meta?: FetchBaseQueryMeta
            }>()
          },
        }),
      }),
    })
  })

  describe('TypedOnQueryStarted', () => {
    type Post = {
      id: number
      title: string
      userId: number
    }

    type PostsApiResponse = {
      posts: Post[]
      total: number
      skip: number
      limit: number
    }

    type QueryArgument = number | undefined

    type BaseQueryFunction = ReturnType<typeof fetchBaseQuery>

    type User = {
      id: number
      firstName: string
      lastName: string
    }

    type UsersApiResponse = {
      users: User[]
      total: number
      skip: number
      limit: number
    }

    test('TypedOnQueryStarted creates a pre-typed version of onQueryStarted', () => {
      const baseApiSlice = createApi({
        baseQuery: fetchBaseQuery({ baseUrl: 'https://dummyjson.com' }),
        reducerPath: 'usersApi',
        tagTypes: ['Users'],
        endpoints: (build) => ({
          getUsers: build.query<UsersApiResponse, undefined>({
            query: () => '/users',
          }),

          getUserById: build.query<User, QueryArgument>({
            query: (userId) => `/users/${userId}`,
          }),

          getPostsById: build.query<Post, QueryArgument>({
            query: (postId) => `/posts/${postId}`,
          }),

          getPosts: build.query<PostsApiResponse, undefined>({
            query: () => '/posts',
          }),
        }),
      })

      const updateUserOnComplete: TypedOnQueryStarted<
        User,
        QueryArgument,
        BaseQueryFunction,
        'usersApi',
        'query'
      > = async (queryArgument, queryLifeCycleApi) => {
        const {
          queryFulfilled,
          getState,
          extra,
          dispatch,
          getCacheEntry,
          requestId,
          updateCachedData,
        } = queryLifeCycleApi

        expectTypeOf(queryArgument).toEqualTypeOf<QueryArgument>()

        expectTypeOf(dispatch).toEqualTypeOf<
          ThunkDispatch<any, any, UnknownAction>
        >()

        expectTypeOf(extra).toBeUnknown()

        expectTypeOf(getState).toEqualTypeOf<
          () => RootState<any, any, 'usersApi'>
        >()

        expectTypeOf(requestId).toBeString()

        expectTypeOf(getCacheEntry).toBeFunction()

        expectTypeOf(updateCachedData).toEqualTypeOf<
          (updateRecipe: Recipe<User>) => PatchCollection
        >()

        const result = await queryFulfilled

        dispatch(
          baseApiSlice.util.updateQueryData(
            'getUserById',
            undefined,
            (draftUser) => {
              if (draftUser.id === result.data.id) {
                return result.data
              }
            },
          ),
        )
      }

      const extendedApi = baseApiSlice.injectEndpoints({
        endpoints: (build) => ({
          getPosts: build.query<User, QueryArgument>({
            query: () => '/posts',
            onQueryStarted: updateUserOnComplete,
          }),
        }),
      })

      createApi({
        baseQuery: fetchBaseQuery({ baseUrl: 'https://dummyjson.com' }),
        reducerPath: 'usersApi',
        tagTypes: ['Users'],
        endpoints: (build) => ({
          getPosts: build.query<User, QueryArgument>({
            query: () => '/posts',
            onQueryStarted: updateUserOnComplete,
          }),
        }),
      })
    })

    test('TypedOnQueryStarted mutation', () => {
      const baseApiSlice = createApi({
        baseQuery: fetchBaseQuery({ baseUrl: 'https://dummyjson.com' }),
        reducerPath: 'usersApi',
        tagTypes: ['Users'],
        endpoints: (build) => ({
          getUsers: build.query<User[], undefined>({
            query: () => `/users`,
          }),

          getUserById: build.query<User, QueryArgument>({
            query: (userId) => `/users/${userId}`,
          }),

          getPostById: build.query<PostsApiResponse, QueryArgument>({
            query: (postId) => `/posts/${postId}`,
          }),
        }),
      })

      const updateUserOnComplete: TypedOnQueryStarted<
        User,
        Post,
        BaseQueryFunction,
        'usersApi',
        'mutation'
      > = async (queryArgument, mutationLifeCycleApi) => {
        const { userId, id, title } = queryArgument

        const {
          dispatch,
          queryFulfilled,
          extra,
          getCacheEntry,
          getState,
          requestId,
        } = mutationLifeCycleApi

        expectTypeOf(queryArgument).toEqualTypeOf<Post>()

        expectTypeOf(dispatch).toEqualTypeOf<
          ThunkDispatch<any, any, UnknownAction>
        >()

        expectTypeOf(extra).toBeUnknown()

        expectTypeOf(getState).toEqualTypeOf<
          () => RootState<any, any, 'usersApi'>
        >()

        expectTypeOf(requestId).toBeString()

        expectTypeOf(getCacheEntry).toBeFunction()

        expectTypeOf(mutationLifeCycleApi).not.toHaveProperty(
          'updateCachedData',
        )

        const result = await queryFulfilled

        dispatch(
          baseApiSlice.util.updateQueryData(
            'getUserById',
            undefined,
            (draftUser) => {
              if (draftUser.id === result.data.id) {
                return result.data
              }
            },
          ),
        )
      }

      const extendedApi = baseApiSlice.injectEndpoints({
        endpoints: (build) => ({
          addPost: build.mutation<User, Post>({
            query: (body) => ({
              url: `posts`,
              method: 'POST',
              body,
            }),

            onQueryStarted: updateUserOnComplete,
          }),

          updatePost: build.mutation<User, Post>({
            query: ({ id, ...patch }) => ({
              url: `post/${id}`,
              method: 'PATCH',
              body: patch,
            }),

            onQueryStarted: updateUserOnComplete,
          }),
        }),
      })
    })

    test('TypedOnQueryStarted query', () => {
      const baseApiSlice = createApi({
        baseQuery: fetchBaseQuery({ baseUrl: 'https://dummyjson.com' }),
        reducerPath: 'usersApi',
        tagTypes: ['Users'],
        endpoints: (build) => ({
          getUsers: build.query<User[], undefined>({
            query: () => `/users`,
          }),

          getUserById: build.query<User, QueryArgument>({
            query: (userId) => `/users/${userId}`,
          }),

          getPostById: build.query<PostsApiResponse, QueryArgument>({
            query: (postId) => `/posts/${postId}`,
          }),
        }),
      })

      const updateUserOnComplete: TypedOnQueryStarted<
        User,
        Post,
        BaseQueryFunction,
        'usersApi',
        'query'
      > = async (queryArgument, queryLifeCycleApi) => {
        const { userId, id, title } = queryArgument

        const {
          dispatch,
          extra,
          getCacheEntry,
          getState,
          queryFulfilled,
          requestId,
          updateCachedData,
        } = queryLifeCycleApi

        expectTypeOf(queryFulfilled).resolves.toEqualTypeOf<{
          data: User
          meta: FetchBaseQueryMeta | undefined
        }>()

        const result = await queryFulfilled

        expectTypeOf(queryArgument).toEqualTypeOf<Post>()

        expectTypeOf(dispatch).toEqualTypeOf<
          ThunkDispatch<any, any, UnknownAction>
        >()

        expectTypeOf(extra).toBeUnknown()

        expectTypeOf(getState).toEqualTypeOf<
          () => RootState<any, any, 'usersApi'>
        >()

        expectTypeOf(requestId).toBeString()

        expectTypeOf(getCacheEntry).toBeFunction()

        expectTypeOf(updateCachedData).toEqualTypeOf<
          (updateRecipe: Recipe<User>) => PatchCollection
        >()

        dispatch(
          baseApiSlice.util.updateQueryData(
            'getUserById',
            userId,
            (draftUser) => {
              if (draftUser.id === result.data.id) {
                return result.data
              }
            },
          ),
        )
      }

      const extendedApi = baseApiSlice.injectEndpoints({
        endpoints: (build) => ({
          addPost: build.query<User, Post>({
            query: (body) => ({
              url: `posts`,
              method: 'POST',
              body,
            }),

            onQueryStarted: updateUserOnComplete,
          }),

          updatePost: build.query<User, Post>({
            query: ({ id, ...patch }) => ({
              url: `post/${id}`,
              method: 'PATCH',
              body: patch,
            }),

            onQueryStarted: updateUserOnComplete,
          }),
        }),
      })
    })

    test('TypedOnQueryStarted query and mutation', () => {
      const baseApiSlice = createApi({
        baseQuery: fetchBaseQuery({ baseUrl: 'https://dummyjson.com' }),
        reducerPath: 'usersApi',
        tagTypes: ['Users'],
        endpoints: (build) => ({
          getUsers: build.query<User[], undefined>({
            query: () => `/users`,
          }),

          getUserById: build.query<User, QueryArgument>({
            query: (userId) => `/users/${userId}`,
          }),

          getPostById: build.query<PostsApiResponse, QueryArgument>({
            query: (postId) => `/posts/${postId}`,
          }),
        }),
      })

      const updateUserOnComplete: TypedOnQueryStarted<
        User,
        Post,
        BaseQueryFunction,
        'usersApi'
      > = async (queryArgument, lifeCycleApi) => {
        const { userId, id, title } = queryArgument

        const {
          dispatch,
          queryFulfilled,
          extra,
          getCacheEntry,
          getState,
          requestId,
        } = lifeCycleApi

        expectTypeOf(queryFulfilled).resolves.toEqualTypeOf<{
          data: User
          meta: FetchBaseQueryMeta | undefined
        }>()

        const result = await queryFulfilled

        expectTypeOf(queryArgument).toEqualTypeOf<Post>()

        expectTypeOf(dispatch).toEqualTypeOf<
          ThunkDispatch<any, any, UnknownAction>
        >()

        expectTypeOf(extra).toBeUnknown()

        expectTypeOf(getState).toEqualTypeOf<
          () => RootState<any, any, 'usersApi'>
        >()

        expectTypeOf(requestId).toBeString()

        expectTypeOf(getCacheEntry).toBeFunction()

        expectTypeOf(lifeCycleApi).not.toHaveProperty('updateCachedData')

        dispatch(
          baseApiSlice.util.updateQueryData(
            'getUserById',
            undefined,
            (draftUser) => {
              if (draftUser.id === result.data.id) {
                return result.data
              }
            },
          ),
        )
      }

      const extendedApi = baseApiSlice.injectEndpoints({
        endpoints: (build) => ({
          addPost: build.query<User, Post>({
            query: (body) => ({
              url: `posts`,
              method: 'POST',
              body,
            }),

            onQueryStarted: updateUserOnComplete,
          }),

          updatePost: build.mutation<User, Post>({
            query: ({ id, ...patch }) => ({
              url: `post/${id}`,
              method: 'PATCH',
              body: patch,
            }),

            onQueryStarted: updateUserOnComplete,
          }),
        }),
      })
    })
  })
})
