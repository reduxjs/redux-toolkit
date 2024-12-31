import { baseApi } from "../baseApi"

type Project = {
  id: number
  name: string
}

type ProjectsPageCursor = {
  projects: Project[]
  nextId: number | null
  previousId: number | null
}

export const apiWithInfiniteScrollMax = baseApi.injectEndpoints({
  endpoints: build => ({
    getProjectsCursorMax: build.infiniteQuery<
      ProjectsPageCursor,
      string,
      number
    >({
      query: page => `https://example.com/api/projectsCursor?cursor=${page}`,
      infiniteQueryOptions: {
        initialPageParam: 0,
        maxPages: 3,
        getPreviousPageParam: firstPage => firstPage.previousId ?? undefined,
        getNextPageParam: lastPage => lastPage.nextId ?? undefined,
      },
    }),
  }),
})

// export const { useGetProjectsQuery } = apiWithPagination
