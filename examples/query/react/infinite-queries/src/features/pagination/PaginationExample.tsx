import React from "react"
import { apiWithPagination } from "./paginationApi"

export const PaginationExample = () => {
  const [page, setPage] = React.useState(0)
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    isError,
  } = apiWithPagination.endpoints.getProjects.useInfiniteQuery("projects")

  const currentPage = data?.pages[page]

  return (
    <div>
      <div>Current Page: {page + 1}</div>
      <button
        onClick={() => {
          setPage(old => Math.max(old - 1, 0))
        }}
        disabled={page === 0}
      >
        Previous Page
      </button>{" "}
      <button
        onClick={() => {
          setPage(old => (currentPage?.hasMore ? old + 1 : old))
          fetchNextPage()
        }}
        disabled={!currentPage?.hasMore}
      >
        Next Page
      </button>
      <h3>Results</h3>
      {isFetching ? (
        <div>Loading...</div>
      ) : isError ? (
        <div>Error: {error.message}</div>
      ) : (
        <div>
          {currentPage?.projects.map(project => (
            <p key={project.id}>{project.name}</p>
          ))}
        </div>
      )}
    </div>
  )
}
