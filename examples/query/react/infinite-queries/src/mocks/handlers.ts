import { http, HttpResponse } from 'msw'

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const projects = Array.from({ length: 50 }, (_, i) => {
  return {
    id: i,
    createdAt: Date.now() + i * 1000,
  }
})

export const handlers = [
  http.get('https://example.com/api/projects', async ({ request, params }) => {
    const url = new URL(request.url)
    const pageParam = url.searchParams.get('page') || '0'
    const page = parseInt(pageParam, 10)

    const pageSize = 10
    const maxPages = 5

    await delay(1000)

    const projects = Array(pageSize)
      .fill(0)
      .map((_, i) => {
        const id = page * pageSize + (i + 1)
        return {
          name: 'Project ' + id,
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
    'https://example.com/api/projectsCursor',
    async ({ request, params }) => {
      const url = new URL(request.url)
      const cursorParam = url.searchParams.get('cursor') || '0'
      const cursor = parseInt(cursorParam, 10)

      const pageSize = 10
      const totalItems = 50

      await delay(1000)

      const projects = Array(pageSize)
        .fill(0)
        .map((_, i) => {
          const id = cursor + i
          return {
            name: 'Project ' + id + ` (server time: ${Date.now()})`,
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
    'https://example.com/api/projectsBidirectionalCursor',
    async ({ request }) => {
      const url = new URL(request.url)
      const limit = parseInt(url.searchParams.get('limit') ?? '5', 10)
      const aroundCursor = parseInt(url.searchParams.get('around') ?? '', 10)
      const afterCursor = parseInt(url.searchParams.get('after') ?? '', 10)
      const beforeCursor = parseInt(url.searchParams.get('before') ?? '', 10)

      const validateCursor = (cursor: number, cursorType: string): number => {
        const cursorIndex = projects.findIndex(
          (project) => project.id === cursor,
        )
        if (cursorIndex === -1) {
          throw new Error(`Invalid \`${cursorType}\` cursor.`)
        }
        return cursorIndex
      }

      let resultProjects = []
      try {
        if (!isNaN(afterCursor)) {
          const afterCursorIndex = validateCursor(afterCursor, 'after')
          const afterIndex = afterCursorIndex + 1
          resultProjects = projects.slice(afterIndex, afterIndex + limit)
        } else if (!isNaN(beforeCursor)) {
          const beforeCursorIndex = validateCursor(beforeCursor, 'before')
          const startIndex = Math.max(0, beforeCursorIndex - limit)
          resultProjects = projects.slice(startIndex, beforeCursorIndex)
        } else if (!isNaN(aroundCursor)) {
          const aroundCursorIndex = validateCursor(aroundCursor, 'around')
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
        return HttpResponse.json({
          projects: resultProjects,
          serverTime: Date.now(),
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

      return undefined
    },
  ),
  http.get(
    'https://example.com/api/projectsLimitOffset',
    async ({ request }) => {
      const url = new URL(request.url)
      const limit = parseInt(url.searchParams.get('limit') ?? '5', 10)
      let offset = parseInt(url.searchParams.get('offset') ?? '0', 10)

      if (isNaN(offset) || offset < 0) {
        offset = 0
      }
      if (isNaN(limit) || limit <= 0) {
        return HttpResponse.json(
          {
            message:
              "Invalid 'limit' parameter. It must be a positive integer.",
          },
          { status: 400 },
        )
      }

      const result = projects.slice(offset, offset + limit)

      await delay(1000)
      return HttpResponse.json({
        projects: result,
        serverTime: Date.now(),
        numFound: projects.length,
      })
    },
  ),
  http.get('https://example.com/api/projectsPaginated', async ({ request }) => {
    const url = new URL(request.url)
    const size = parseInt(url.searchParams.get('size') ?? '5', 10)
    let page = parseInt(url.searchParams.get('page') ?? '0', 10)

    if (isNaN(page) || page < 0) {
      page = 0
    }
    if (isNaN(size) || size <= 0) {
      return HttpResponse.json(
        { message: "Invalid 'size' parameter. It must be a positive integer." },
        { status: 400 },
      )
    }

    const startIndex = page * size
    const endIndex = startIndex + size
    const result = projects.slice(startIndex, endIndex)

    await delay(1000)
    return HttpResponse.json({
      projects: result,
      serverTime: Date.now(),
      totalPages: Math.ceil(projects.length / size), // totalPages is a parameter required for this example, but an API could include additional fields that can be used in certain scenarios, such as determining getNextPageParam or getPreviousPageParam.
      // totalElements: projects.length,
      // numberOfElements: result.length,
      // isLast: endIndex >= projects.length,
      // isFirst: page === 0,
    })
  }),
]
