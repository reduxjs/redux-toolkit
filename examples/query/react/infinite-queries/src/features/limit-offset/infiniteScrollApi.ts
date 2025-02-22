import { baseApi } from "../baseApi"

type Project = {
  id: number
  createdAt: string
}

export type ProjectsResponse = {
  projects: Project[]
  numFound: number
  serverTime: string
}

type ProjectsInitialPageParam = {
  offset: number
  limit: number
}

export const apiWithInfiniteScroll = baseApi.injectEndpoints({
  endpoints: build => ({
    projectsLimitOffset: build.infiniteQuery<
      ProjectsResponse,
      void,
      ProjectsInitialPageParam
    >({
      infiniteQueryOptions: {
        initialPageParam: {
          offset: 0,
          limit: 20,
        },
        getNextPageParam: (
          lastPage,
          allPages,
          lastPageParam,
          allPageParams,
        ) => {
          const nextOffset = lastPageParam.offset + lastPageParam.limit
          const remainingItems = lastPage?.numFound - nextOffset

          if (remainingItems <= 0) {
            return undefined
          }

          return {
            ...lastPageParam,
            offset: nextOffset,
          }
        },
        getPreviousPageParam: (
          firstPage,
          allPages,
          firstPageParam,
          allPageParams,
        ) => {
          const prevOffset = firstPageParam.offset - firstPageParam.limit
          if (prevOffset < 0) return undefined

          return {
            ...firstPageParam,
            offset: firstPageParam.offset - firstPageParam.limit,
          }
        },
      },
      query: ({ pageParam: { offset, limit } }) => {
        return `https://example.com/api/projectsLimitOffset?offset=${offset}&limit=${limit}`
      },
    }),
  }),
})
