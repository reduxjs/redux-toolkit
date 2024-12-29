import { baseApi } from "../baseApi"

type Project = {
  id: number
  createdAt: string
}

export type ProjectsResponse = {
  projects: Project[]
  serverTime: string
  totalPages: number
}

interface ProjectsInitialPageParam {
  page: number
  size: number
}

export const apiWithInfiniteScroll = baseApi.injectEndpoints({
  endpoints: builder => ({
    projectsPaginated: builder.infiniteQuery<
      ProjectsResponse,
      void,
      ProjectsInitialPageParam
    >({
      infiniteQueryOptions: {
        initialPageParam: {
          page: 0,
          size: 20,
        },
        getNextPageParam: (
          lastPage,
          allPages,
          lastPageParam,
          allPageParams,
        ) => {
          const nextPage = lastPageParam.page + 1
          const remainingPages = lastPage?.totalPages - nextPage

          if (remainingPages <= 0) {
            return undefined
          }

          return {
            ...lastPageParam,
            page: nextPage,
          }
        },
        getPreviousPageParam: (
          firstPage,
          allPages,
          firstPageParam,
          allPageParams,
        ) => {
          const prevPage = firstPageParam.page - 1
          if (prevPage < 0) return undefined

          return {
            ...firstPageParam,
            page: prevPage,
          }
        },
      },
      query: ({ page, size }) => {
        return {
          url: `https://example.com/api/projectsPaginated?page=${page}&size=${size}`,
          method: "GET",
        }
      },
    }),
  }),
})
