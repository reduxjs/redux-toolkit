import { baseApi } from '../baseApi'

type Project = {
  id: number
  name: string
}

type ProjectsPage = {
  projects: Project[]
  hasMore: boolean
}

export const apiWithPagination = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getProjects: build.infiniteQuery<ProjectsPage, string, number>({
      query: ({ pageParam }) =>
        `https://example.com/api/projects?page=${pageParam}`,
      infiniteQueryOptions: {
        initialPageParam: 0,
        getNextPageParam: (lastPage, pages, lastPageParam, allPageParams) => {
          if (!lastPage.hasMore) return undefined
          return pages.length
        },
      },
    }),
  }),
})

// export const { useGetProjectsQuery } = apiWithPagination
