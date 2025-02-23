import { baseApi } from "../baseApi"

type Project = {
  id: number
  createdAt: string
}

type ProjectsCursorPaginated = {
  projects: Project[]
  serverTime: string
  pageInfo: {
    startCursor: number
    endCursor: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

type ProjectsInitialPageParam = {
  before?: number
  around?: number
  after?: number
  limit: number
}
type QueryParamLimit = number

export const apiWithInfiniteScroll = baseApi.injectEndpoints({
  endpoints: build => ({
    getProjectsBidirectionalCursor: build.infiniteQuery<
      ProjectsCursorPaginated,
      QueryParamLimit,
      ProjectsInitialPageParam
    >({
      query: ({ pageParam: { before, after, around, limit } }) => {
        const params = new URLSearchParams()
        params.append("limit", String(limit))
        if (after != null) {
          params.append("after", String(after))
        } else if (before != null) {
          params.append("before", String(before))
        } else if (around != null) {
          params.append("around", String(around))
        }

        return {
          url: `https://example.com/api/projectsBidirectionalCursor?${params.toString()}`,
        }
      },
      infiniteQueryOptions: {
        initialPageParam: { limit: 10 },
        getPreviousPageParam: (
          firstPage,
          allPages,
          firstPageParam,
          allPageParams,
        ) => {
          if (!firstPage.pageInfo.hasPreviousPage) {
            return undefined
          }
          return {
            before: firstPage.pageInfo.startCursor,
            limit: firstPageParam.limit,
          }
        },
        getNextPageParam: (
          lastPage,
          allPages,
          lastPageParam,
          allPageParams,
        ) => {
          if (!lastPage.pageInfo.hasNextPage) {
            return undefined
          }
          return {
            after: lastPage.pageInfo.endCursor,
            limit: lastPageParam.limit,
          }
        },
      },
    }),
  }),
})
