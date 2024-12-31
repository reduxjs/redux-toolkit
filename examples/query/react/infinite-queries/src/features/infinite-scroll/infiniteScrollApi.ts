import { baseApi } from "../baseApi"

export type Project = {
  id: number
  name: string
}

type ProjectsPageCursor = {
  projects: Project[]
  nextId: number | null
  previousId: number | null
}

export const apiWithInfiniteScroll = baseApi.injectEndpoints({
  endpoints: build => ({
    getProjectsCursor: build.infiniteQuery<ProjectsPageCursor, string, number>({
      query: page => `https://example.com/api/projectsCursor?cursor=${page}`,
      infiniteQueryOptions: {
        initialPageParam: 0,
        getPreviousPageParam: firstPage => firstPage.previousId,
        getNextPageParam: (
          lastPage,
          allPages,
          lastPageParam,
          allPageParams,
        ) => {
          return lastPage.nextId
        },
      },
    }),
  }),
})

// export const { useGetProjectsQuery } = apiWithPagination
