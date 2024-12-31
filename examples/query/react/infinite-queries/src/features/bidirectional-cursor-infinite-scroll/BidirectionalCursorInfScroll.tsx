import React, { useCallback, useEffect, useRef, useState } from "react"
import { Link, useLocation } from "react-router"
import { useIntersectionCallback } from "../../app/useIntersectionCallback"
import { apiWithInfiniteScroll } from "./infiniteScrollApi"

const limit = 10

function BidirectionalCursorInfScroll({ startingProject = { id: 25 } }) {
  const {
    hasPreviousPage,
    hasNextPage,
    data,
    error,
    isFetching,
    isLoading,
    isError,
    fetchNextPage,
    fetchPreviousPage,
    isFetchingNextPage,
    isFetchingPreviousPage,
  } =
    apiWithInfiniteScroll.endpoints.getProjectsBidirectionalCursor.useInfiniteQuery(
      limit,
      {
        initialPageParam: {
          around: startingProject.id,
          limit,
        },
      },
    )

  const beforeRef = useIntersectionCallback(fetchPreviousPage)
  const afterRef = useIntersectionCallback(fetchNextPage)

  const location = useLocation()

  const startingProjectRef = useRef<HTMLDivElement>(null)
  const [hasCentered, setHasCentered] = useState(false)

  useEffect(() => {
    if (hasCentered) return
    const startingElement = startingProjectRef.current
    if (startingElement) {
      startingElement.scrollIntoView({
        behavior: "auto",
        block: "center",
      })
      setHasCentered(true)
    }
  }, [data?.pages, hasCentered])

  return (
    <div>
      <h2>Bidirectional Cursor-Based Infinite Scroll</h2>
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
              ? "Loading more..."
              : hasPreviousPage
                ? "Load Older"
                : "Nothing more to load"}
          </button>
        </div>
        <div
          style={{
            overflow: "auto",
            margin: "1rem 0px",
            height: "400px",
          }}
        >
          <div ref={beforeRef} />
          {data?.pages.map(page => (
            <React.Fragment key={page.pageInfo?.endCursor}>
              {page.projects.map((project, index, arr) => {
                return (
                  <div
                    style={{
                      margin: "1em 0px",
                      border: "1px solid gray",
                      borderRadius: "5px",
                      padding: "2rem 1rem",
                      background: `hsla(${project.id * 30}, 60%, 80%, 1)`,
                    }}
                    key={project.id}
                    ref={
                      project.id === startingProject.id
                        ? startingProjectRef
                        : null
                    }
                  >
                    <div>{`Project ${project.id} (created at: ${project.createdAt})`}</div>
                    <div>{`Server Time: ${page.serverTime}`}</div>
                  </div>
                )
              })}
            </React.Fragment>
          ))}
          <div ref={afterRef} />
        </div>
        <div>
          <button
            onClick={() => fetchNextPage()}
            disabled={!hasNextPage || isFetchingNextPage}
          >
            {isFetchingNextPage
              ? "Loading more..."
              : hasNextPage
                ? "Load Newer"
                : "Nothing more to load"}
          </button>
        </div>
        <div>
          {isFetching && !isFetchingPreviousPage && !isFetchingNextPage
            ? "Background Updating..."
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

export default BidirectionalCursorInfScroll
