import { delay } from 'msw'
import { createApi } from '@reduxjs/toolkit/query'
import { buildHooksForApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react'

interface Post {
  id: number
  title: string
}

const api = createApi({
  baseQuery: fakeBaseQuery(),
  endpoints: (build) => ({
    getPost: build.query<Post, number>({
      async queryFn(id) {
        await delay()
        return {
          data: {
            id,
            title: 'foo',
          },
        }
      },
    }),
    deletePost: build.mutation<void, number>({
      async queryFn() {
        await delay()
        return {
          data: undefined,
        }
      },
    }),
  }),
})
describe('lazy react hooks', () => {
  it('only creates hooks once buildHooks is called', async () => {
    expect(api.endpoints.getPost).not.toHaveProperty('useQuery')
    expect(api).not.toHaveProperty('useGetPostQuery')

    expect(api.endpoints.deletePost).not.toHaveProperty('useMutation')
    expect(api).not.toHaveProperty('useDeletePostMutation')

    const hooks = buildHooksForApi(api)

    expect(hooks.endpoints.getPost).toEqual({
      useLazyQuery: expect.any(Function),
      useLazyQuerySubscription: expect.any(Function),
      useQuery: expect.any(Function),
      useQueryState: expect.any(Function),
      useQuerySubscription: expect.any(Function),
    })
    expect(hooks.useGetPostQuery).toEqual(expect.any(Function))

    expect(hooks.endpoints.deletePost).toEqual({
      useMutation: expect.any(Function),
    })
    expect(hooks.useDeletePostMutation).toEqual(expect.any(Function))
  })
})
