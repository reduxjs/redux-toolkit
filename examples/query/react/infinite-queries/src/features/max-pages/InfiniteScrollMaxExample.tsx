import React from 'react'
import { apiWithInfiniteScrollMax } from './infiniteScrollApi'

export const InfiniteScrollMaxPagesExample = () => {
  const {
    data,
    error,
    fetchNextPage,
    fetchPreviousPage,
    // hasNextPage,
    isFetchingNextPage,
    isFetching,
    isError,
  } =
    apiWithInfiniteScrollMax.endpoints.getProjectsCursorMax.useInfiniteQuery(
      'projects',
    )

  // TODO This should be built in to RTKQ
  const hasNextPage = data?.pages[data.pages.length - 1].nextId !== null
  const hasPreviousPage = data?.pages[0].previousId !== null

  return (
    <div>
      <h2>Infinite Query with max pages</h2>
      <h3>3 pages max</h3>
      {isFetching ? (
        <p>Loading...</p>
      ) : isError ? (
        <span>Error: {error.message}</span>
      ) : (
        <>
          <div>
            <button
              onClick={() => fetchPreviousPage()}
              disabled={!hasPreviousPage /* || isFetchingPreviousPage*/}
            >
              {
                /*isFetchingPreviousPage
                  ? 'Loading more...'
                  :*/ hasPreviousPage ? 'Load Older' : 'Nothing more to load'
              }
            </button>
          </div>
          {data?.pages.map((page) => (
            <React.Fragment key={page.nextId}>
              {page.projects.map((project) => (
                <p
                  style={{
                    border: '1px solid gray',
                    borderRadius: '5px',
                    padding: '8px',
                    fontSize: '14px',
                    background: `hsla(${project.id * 30}, 60%, 80%, 1)`,
                  }}
                  key={project.id}
                >
                  {project.name}
                </p>
              ))}
            </React.Fragment>
          ))}
          <div>
            <button
              onClick={() => fetchNextPage()}
              disabled={!hasNextPage /* || isFetchingNextPage*/}
            >
              {isFetchingNextPage
                ? 'Loading more...'
                : hasNextPage
                  ? 'Load Newer'
                  : 'Nothing more to load'}
            </button>
          </div>
          <div>
            {isFetching && !isFetchingNextPage
              ? 'Background Updating...'
              : null}
          </div>
        </>
      )}
      <hr />
    </div>
  )
}
