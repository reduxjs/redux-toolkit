import { baseApi } from "../baseApi"

type Project = {
  id: number
  name: string
}

type ProjectsPage = {
  projects: Project[]
  hasMore: boolean
}

export const apiWithPagination = baseApi.injectEndpoints({
  endpoints: build => ({
    getProjects: build.infiniteQuery<ProjectsPage, string, number>({
      query: page => `https://example.com/api/projects?page=${page}`,
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
