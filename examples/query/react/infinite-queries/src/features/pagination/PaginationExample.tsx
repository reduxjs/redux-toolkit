import React from 'react'
import { apiWithPagination } from './paginationApi'

// The React Query example actually just uses a normal query
// rather than an infinite query, and Dominik confirmed that
// that "infinite queries" should really only be used if you
// want to display _all_ of the pages.
// > "The drawback is shown right in your example: fetching is no longer declarative - you need to keep page in-sync with fetchNextPage. And if you are on page 3 and go back to two, then forward to 3 again it falls apart as fetchNextPage would fetch page 4 instead of refetching page 3"
// Still, it's worth exploring how we might use infinite queries
// for a basic pagination scenario.

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
  } = apiWithPagination.endpoints.getProjects.useInfiniteQuery('projects')

  const currentPage = data?.pages[page]

  return (
    <div>
      <h2>Pagination Example</h2>
      <div>Current Page: {page + 1}</div>
      <button
        onClick={() => {
          setPage((old) => Math.max(old - 1, 0))
        }}
        disabled={page === 0}
      >
        Previous Page
      </button>{' '}
      <button
        onClick={() => {
          setPage((old) => (currentPage?.hasMore ? old + 1 : old))
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
          {currentPage?.projects.map((project) => (
            <p key={project.id}>{project.name}</p>
          ))}
        </div>
      )}
    </div>
  )
}
