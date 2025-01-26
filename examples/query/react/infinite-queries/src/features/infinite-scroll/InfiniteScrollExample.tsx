import React from "react"
import { useInView } from "react-intersection-observer"
import { Link } from "react-router"

import { apiWithInfiniteScroll } from "./infiniteScrollApi"
import type { Project } from "./infiniteScrollApi"

export const InfiniteScrollAbout = () => {
  return (
    <a
      href=""
      onClick={e => {
        window.history.back()
        e.preventDefault()
      }}
    >
      Back
    </a>
  )
}

export const ProjectRow = ({ project }: { project: Project }) => {
  return (
    <p
      style={{
        border: "1px solid gray",
        borderRadius: "5px",
        padding: "5rem 1rem",
        background: `hsla(${project.id * 30}, 60%, 80%, 1)`,
      }}
      key={project.id}
    >
      {project.name}
    </p>
  )
}

export const InfiniteScrollExample = () => {
  const {
    data,
    error,
    fetchNextPage,
    fetchPreviousPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    isError,
  } =
    apiWithInfiniteScroll.endpoints.getProjectsCursor.useInfiniteQuery(
      "projects",
    )

  const { ref, inView } = useInView()

  React.useEffect(() => {
    if (inView) {
      console.log("Fetching next page")
      fetchNextPage()
    }
  }, [fetchNextPage, inView])

  return (
    <div>
      <h2>Infinite Scroll Example</h2>
      {isFetching ? (
        <p>Loading...</p>
      ) : isError ? (
        <span>Error: {error.message}</span>
      ) : null}
      {
        <>
          <div>
            <button
              onClick={() => fetchPreviousPage()}
              // disabled={!hasPreviousPage || isFetchingPreviousPage}
            >
              {/* {isFetchingPreviousPage
                ? "Loading more..."
                : hasPreviousPage
                  ? "Load Older"
                  : "Nothing more to load"} */}
            </button>
          </div>
          {data?.pages.map(page => (
            <React.Fragment key={page.nextId}>
              {page.projects.map(project => (
                <ProjectRow key={project.id} project={project} />
              ))}
            </React.Fragment>
          ))}
          <div>
            <button
              ref={ref}
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
          <div>{isFetching ? "Background Updating..." : null}</div>
        </>
      }
      <hr />
      <Link to="/infinite-scroll/about">Go to another page</Link>
    </div>
  )
}
