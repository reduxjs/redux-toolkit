import type { UseMutation, UseQuery } from '@internal/query/react/buildHooks'
import { waitMs } from '@internal/tests/utils/helpers'
import type { SerializedError } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { SubscriptionOptions } from '@reduxjs/toolkit/query/react'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { useState } from 'react'

let amount = 0
let nextItemId = 0

interface Item {
  id: number
}

const api = createApi({
  baseQuery: async (arg: any) => {
    await waitMs(150)
    if (arg?.body && 'amount' in arg.body) {
      amount += 1
    }

    if (arg?.body && 'forceError' in arg.body) {
      return {
        error: {
          status: 500,
          data: null,
        },
      }
    }

    if (arg?.body && 'listItems' in arg.body) {
      const items: Item[] = []
      for (let i = 0; i < 3; i++) {
        const item = { id: nextItemId++ }
        items.push(item)
      }
      return { data: items }
    }

    return {
      data: arg?.body ? { ...arg.body, ...(amount ? { amount } : {}) } : {},
    }
  },
  endpoints: (build) => ({
    getUser: build.query<{ name: string }, number>({
      query: () => ({
        body: { name: 'Timmy' },
      }),
    }),
    getUserAndForceError: build.query<{ name: string }, number>({
      query: () => ({
        body: {
          forceError: true,
        },
      }),
    }),
    getIncrementedAmount: build.query<{ amount: number }, void>({
      query: () => ({
        url: '',
        body: {
          amount,
        },
      }),
    }),
    updateUser: build.mutation<{ name: string }, { name: string }>({
      query: (update) => ({ body: update }),
    }),
    getError: build.query({
      query: () => '/error',
    }),
    listItems: build.query<Item[], { pageNumber: number }>({
      serializeQueryArgs: ({ endpointName }) => {
        return endpointName
      },
      query: ({ pageNumber }) => ({
        url: `items?limit=1&offset=${pageNumber}`,
        body: {
          listItems: true,
        },
      }),
      merge: (currentCache, newItems) => {
        currentCache.push(...newItems)
      },
      forceRefetch: () => {
        return true
      },
    }),
  }),
})

const ANY = {} as any

describe('type tests', () => {
  test('useLazyQuery hook callback returns various properties to handle the result', () => {
    function User() {
      const [getUser] = api.endpoints.getUser.useLazyQuery()
      const [{ successMsg, errMsg, isAborted }, setValues] = useState({
        successMsg: '',
        errMsg: '',
        isAborted: false,
      })

      const handleClick = (abort: boolean) => async () => {
        const res = getUser(1)

        // no-op simply for clearer type assertions
        res.then((result) => {
          if (result.isSuccess) {
            expectTypeOf(result).toMatchTypeOf<{
              data: {
                name: string
              }
            }>()

            assertType<{
              data: {
                name: string
              }
            }>(result)

            expectTypeOf(result).not.toEqualTypeOf<{
              data: {
                name: string
              }
            }>()
          }
          if (result.isError) {
            expectTypeOf(result).toMatchTypeOf<{
              error: { status: number; data: unknown } | SerializedError
            }>()

            assertType<{
              error: { status: number; data: unknown } | SerializedError
            }>(result)

            expectTypeOf(result).not.toEqualTypeOf<{
              error: { status: number; data: unknown } | SerializedError
            }>()
          }
        })

        expectTypeOf(res.arg).toBeNumber()

        expectTypeOf(res.requestId).toBeString()

        expectTypeOf(res.abort).toEqualTypeOf<() => void>()

        expectTypeOf(res.unwrap).toEqualTypeOf<
          () => Promise<{ name: string }>
        >()

        expectTypeOf(res.unsubscribe).toEqualTypeOf<() => void>()

        expectTypeOf(res.updateSubscriptionOptions).toEqualTypeOf<
          (options: SubscriptionOptions) => void
        >()

        expectTypeOf(res.refetch).toMatchTypeOf<() => void>()

        assertType<() => void>(res.refetch)

        expectTypeOf(res.refetch).not.toEqualTypeOf<() => void>()

        // abort the query immediately to force an error
        if (abort) res.abort()
        res
          .unwrap()
          .then((result) => {
            expectTypeOf(result).toEqualTypeOf<{ name: string }>()

            setValues({
              successMsg: `Successfully fetched user ${result.name}`,
              errMsg: '',
              isAborted: false,
            })
          })
          .catch((err) => {
            setValues({
              successMsg: '',
              errMsg: `An error has occurred fetching userId: ${res.arg}`,
              isAborted: err.name === 'AbortError',
            })
          })
      }

      return (
        <div>
          <button onClick={handleClick(false)}>Fetch User successfully</button>
          <button onClick={handleClick(true)}>Fetch User and abort</button>
          <div>{successMsg}</div>
          <div>{errMsg}</div>
          <div>{isAborted ? 'Request was aborted' : ''}</div>
        </div>
      )
    }
  })

  test('useMutation hook callback returns various properties to handle the result', async () => {
    function User() {
      const [updateUser] = api.endpoints.updateUser.useMutation()
      const [successMsg, setSuccessMsg] = useState('')
      const [errMsg, setErrMsg] = useState('')
      const [isAborted, setIsAborted] = useState(false)

      const handleClick = async () => {
        const res = updateUser({ name: 'Banana' })

        // no-op simply for clearer type assertions
        res.then((result) => {
          expectTypeOf(result).toMatchTypeOf<
            | {
                error: { status: number; data: unknown } | SerializedError
              }
            | {
                data: {
                  name: string
                }
              }
          >()

          assertType<
            | { error: { status: number; data: unknown } | SerializedError }
            | { data: { name: string } }
          >(result)

          expectTypeOf(result).not.toEqualTypeOf<
            | {
                error: { status: number; data: unknown } | SerializedError
              }
            | {
                data: {
                  name: string
                }
              }
          >()
        })

        expectTypeOf(res.arg).toMatchTypeOf<{
          endpointName: string
          originalArgs: { name: string }
          track?: boolean
        }>()

        assertType<{
          endpointName: string
          originalArgs: { name: string }
          track?: boolean
        }>(res.arg)

        expectTypeOf(res.arg).not.toEqualTypeOf<{
          endpointName: string
          originalArgs: { name: string }
          track?: boolean
        }>()

        expectTypeOf(res.requestId).toBeString()

        expectTypeOf(res.abort).toEqualTypeOf<() => void>()

        expectTypeOf(res.unwrap).toEqualTypeOf<
          () => Promise<{ name: string }>
        >()

        expectTypeOf(res.reset).toEqualTypeOf<() => void>()

        // abort the mutation immediately to force an error
        res.abort()
        res
          .unwrap()
          .then((result) => {
            expectTypeOf(result).toEqualTypeOf<{ name: string }>()

            setSuccessMsg(`Successfully updated user ${result.name}`)
          })
          .catch((err) => {
            setErrMsg(
              `An error has occurred updating user ${res.arg.originalArgs.name}`
            )
            if (err.name === 'AbortError') {
              setIsAborted(true)
            }
          })
      }

      return (
        <div>
          <button onClick={handleClick}>Update User and abort</button>
          <div>{successMsg}</div>
          <div>{errMsg}</div>
          <div>{isAborted ? 'Request was aborted' : ''}</div>
        </div>
      )
    }
  })

  test('selectFromResult (query) behaviors', () => {
    interface Post {
      id: number
      name: string
      fetched_at: string
    }

    type PostsResponse = Post[]

    const api = createApi({
      baseQuery: fetchBaseQuery({ baseUrl: 'https://example.com/' }),
      tagTypes: ['Posts'],
      endpoints: (build) => ({
        getPosts: build.query<PostsResponse, void>({
          query: () => ({ url: 'posts' }),
          providesTags: (result) =>
            result ? result.map(({ id }) => ({ type: 'Posts', id })) : [],
        }),
        updatePost: build.mutation<Post, Partial<Post>>({
          query: ({ id, ...body }) => ({
            url: `post/${id}`,
            method: 'PUT',
            body,
          }),
          invalidatesTags: (result, error, { id }) => [{ type: 'Posts', id }],
        }),
        addPost: build.mutation<Post, Partial<Post>>({
          query: (body) => ({
            url: `post`,
            method: 'POST',
            body,
          }),
          invalidatesTags: ['Posts'],
        }),
      }),
    })

    const counterSlice = createSlice({
      name: 'counter',
      initialState: { count: 0 },
      reducers: {
        increment(state) {
          state.count++
        },
      },
    })

    expectTypeOf(api.useGetPostsQuery).toEqualTypeOf(
      api.endpoints.getPosts.useQuery
    )

    expectTypeOf(api.useUpdatePostMutation).toEqualTypeOf(
      api.endpoints.updatePost.useMutation
    )

    expectTypeOf(api.useAddPostMutation).toEqualTypeOf(
      api.endpoints.addPost.useMutation
    )
  })

  test('UseQuery type can be used to recreate the hook type', () => {
    const fakeQuery = ANY as UseQuery<
      typeof api.endpoints.getUser.Types.QueryDefinition
    >

    expectTypeOf(fakeQuery).toEqualTypeOf(api.endpoints.getUser.useQuery)
  })

  test('UseMutation type can be used to recreate the hook type', () => {
    const fakeMutation = ANY as UseMutation<
      typeof api.endpoints.updateUser.Types.MutationDefinition
    >

    expectTypeOf(fakeMutation).toEqualTypeOf(
      api.endpoints.updateUser.useMutation
    )
  })
})
