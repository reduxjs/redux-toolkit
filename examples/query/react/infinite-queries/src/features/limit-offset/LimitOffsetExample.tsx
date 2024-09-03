import { createSelector } from '@reduxjs/toolkit'
import {
  BaseQueryFn,
  TypedUseQueryStateResult,
} from '@reduxjs/toolkit/query/react'
import { Link, useLocation } from 'react-router'
import { useIntersectionCallback } from '../../app/useIntersectionCallback'
import { apiWithInfiniteScroll, ProjectsResponse } from './infiniteScrollApi'

type ProjectsInfiniteQueryResult = TypedUseQueryStateResult<
  { pages: ProjectsResponse[] },
  unknown,
  BaseQueryFn
>

const selectCombinedProjects = createSelector(
  (res: ProjectsInfiniteQueryResult) => {
    return res.data
  },
  (data) => data?.pages?.map((item) => item?.projects)?.flat(),
)

function LimitOffsetExample() {
  const {
    combinedData,
    hasPreviousPage,
    hasNextPage,
    // data,
    error,
    isFetching,
    isLoading,
    isError,
    fetchNextPage,
    fetchPreviousPage,
    isFetchingNextPage,
    isFetchingPreviousPage,
  } = apiWithInfiniteScroll.endpoints.projectsLimitOffset.useInfiniteQuery(
    undefined,
    {
      selectFromResult: (result) => {
        return {
          ...result,
          combinedData: selectCombinedProjects(result),
        }
      },
    },
  )

  const intersectionCallbackRef = useIntersectionCallback(fetchNextPage)
  const location = useLocation()

  return (
    <div>
      <h2>Limit and Offset Infinite Scroll</h2>
      {isLoading ? (
        <p>Loading...</p>
      ) : isError ? (
        <span>Error: {error.message}</span>
      ) : null}

      <>
        <div>
          <button
            onClick={() => fetchPreviousPage()}
            disabled={!hasPreviousPage || isFetchingPreviousPage}
          >
            {isFetchingPreviousPage
              ? 'Loading more...'
              : hasPreviousPage
                ? 'Load Older'
                : 'Nothing more to load'}
          </button>
        </div>
        <div
          style={{
            overflow: 'auto',
            margin: '1rem 0px',
            height: '400px',
          }}
        >
          {combinedData?.map((project, index, arr) => {
            return (
              <div
                style={{
                  margin: '1em 0px',
                  border: '1px solid gray',
                  borderRadius: '5px',
                  padding: '2rem 1rem',
                  background: `hsla(${project.id * 30}, 60%, 80%, 1)`,
                }}
                key={project.id}
              >
                <div>
                  <div>{`Project ${project.id} (created at: ${project.createdAt})`}</div>
                </div>
              </div>
            )
          })}

          <div ref={intersectionCallbackRef} />
        </div>
        <div>
          <button
            onClick={() => fetchNextPage()}
            disabled={!hasNextPage || isFetchingNextPage}
          >
            {isFetchingNextPage
              ? 'Loading more...'
              : hasNextPage
                ? 'Load Newer'
                : 'Nothing more to load'}
          </button>
        </div>
        <div>
          {isFetching && !isFetchingPreviousPage && !isFetchingNextPage
            ? 'Background Updating...'
            : null}
        </div>
      </>

      <hr />
      <Link to="/infinite-scroll/about" state={{ from: location.pathname }}>
        Go to another page
      </Link>
    </div>
  )
}

export default LimitOffsetExample
