import { http, HttpResponse } from "msw"

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const projects = Array.from({ length: 50 }, (_, i) => {
  return {
    id: i,
    createdAt: Date.now() + i * 1000,
  }
})

export const handlers = [
  http.get("https://example.com/api/projects", async ({ request, params }) => {
    const url = new URL(request.url)
    const pageParam = url.searchParams.get("page") || "0"
    const page = parseInt(pageParam, 10)

    const pageSize = 10
    const maxPages = 5

    await delay(1000)

    const projects = Array(pageSize)
      .fill(0)
      .map((_, i) => {
        const id = page * pageSize + (i + 1)
        return {
          name: "Project " + id,
          id,
        }
      })

    return HttpResponse.json({
      projects,
      // 0-based pagination, so match total count
      hasMore: page < maxPages - 1,
    })
  }),
  http.get(
    "https://example.com/api/projectsCursor",
    async ({ request, params }) => {
      const url = new URL(request.url)
      const cursorParam = url.searchParams.get("cursor") || "0"
      const cursor = parseInt(cursorParam, 10)

      const pageSize = 10
      const totalItems = 50

      await delay(1000)

      const projects = Array(pageSize)
        .fill(0)
        .map((_, i) => {
          const id = cursor + i
          return {
            name: "Project " + id + ` (server time: ${Date.now()})`,
            id,
          }
        })

      const hasNext = cursor < totalItems - pageSize
      const nextId = hasNext ? projects[projects.length - 1].id + 1 : null

      // Prevent negative cursors
      const hasPrevious = cursor > -(totalItems - pageSize)
      const maybePrevCursor = projects[0].id - pageSize
      const previousId =
        hasPrevious && maybePrevCursor >= 0 ? maybePrevCursor : null

      return HttpResponse.json({
        projects,
        nextId,
        previousId,
      })
    },
  ),
  http.get(
    "https://example.com/api/projectsBidirectionalCursor",
    async ({ request }) => {
      const url = new URL(request.url)
      const limit = parseInt(url.searchParams.get("limit") ?? "5", 10)
      const aroundCursor = parseInt(url.searchParams.get("around") ?? "", 10)
      const afterCursor = parseInt(url.searchParams.get("after") ?? "", 10)
      const beforeCursor = parseInt(url.searchParams.get("before") ?? "", 10)

      const validateCursor = (cursor: number, cursorType: string): number => {
        const cursorIndex = projects.findIndex(project => project.id === cursor)
        if (cursorIndex === -1) {
          throw new Error(`Invalid \`${cursorType}\` cursor.`)
        }
        return cursorIndex
      }

      let resultProjects = []
      try {
        if (!isNaN(afterCursor)) {
          const afterCursorIndex = validateCursor(afterCursor, "after")
          const afterIndex = afterCursorIndex + 1
          resultProjects = projects.slice(afterIndex, afterIndex + limit)
        } else if (!isNaN(beforeCursor)) {
          const beforeCursorIndex = validateCursor(beforeCursor, "before")
          const startIndex = Math.max(0, beforeCursorIndex - limit)
          resultProjects = projects.slice(startIndex, beforeCursorIndex)
        } else if (!isNaN(aroundCursor)) {
          const aroundCursorIndex = validateCursor(aroundCursor, "around")
          const ceiledLimit = Math.ceil(limit / 2)

          const beforeIndex = Math.max(0, aroundCursorIndex - ceiledLimit)
          const afterIndex = Math.min(
            projects.length - 1,
            aroundCursorIndex + ceiledLimit,
          )
          const beforeProjects = projects.slice(beforeIndex, aroundCursorIndex)
          const afterProjects = projects.slice(
            aroundCursorIndex + 1,
            afterIndex + 1,
          )

          resultProjects = [
            ...beforeProjects,
            projects[aroundCursorIndex],
            ...afterProjects,
          ]
        } else {
          resultProjects = projects.slice(0, limit)
        }

        const startCursor = resultProjects[0]?.id
        const endCursor = resultProjects[resultProjects.length - 1]?.id

        const hasNextPage = endCursor != null && endCursor < projects.length - 1
        const hasPreviousPage = startCursor !== 0

        await delay(1000)

        const serverTime = Date.now()

        return HttpResponse.json({
          projects: resultProjects,
          serverTime,
          pageInfo: {
            startCursor,
            endCursor,
            hasNextPage,
            hasPreviousPage,
          },
        })
      } catch (error) {
        if (error instanceof Error) {
          return HttpResponse.json({ message: error.message }, { status: 400 })
        }
      }
    },
  ),
]
