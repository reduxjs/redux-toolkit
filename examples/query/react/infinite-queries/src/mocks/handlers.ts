import { http, HttpResponse } from "msw"

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

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

      const nextId =
        cursor < totalItems - pageSize
          ? projects[projects.length - 1].id + 1
          : null
      const previousId =
        cursor > -(totalItems - pageSize) ? projects[0].id - pageSize : null

      return HttpResponse.json({
        projects,
        nextId,
        previousId,
      })
    },
  ),
]
