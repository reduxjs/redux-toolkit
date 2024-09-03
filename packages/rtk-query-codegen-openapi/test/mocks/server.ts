import { headersToObject } from 'headers-polyfill'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import petstoreJSON from '../fixtures/petstore.json'
import petstoreYAML from '../fixtures/petstore.yaml.mock'

// This configures a request mocking server with the given request handlers.

export const server = setupServer(
  http.get(
    'https://example.com/echo',
    async ({ request, params, cookies, requestId }) =>
      HttpResponse.json({
        ...request,
        params,
        cookies,
        requestId,
        url: new URL(request.url),
        headers: headersToObject(request.headers),
      }),
  ),
  http.post(
    'https://example.com/echo',
    async ({ request, params, cookies, requestId }) => {
      let body

      try {
        body =
          headersToObject(request.headers)['content-type'] === 'text/html'
            ? await request.text()
            : await request.json()
      } catch (err) {
        body = request.body
      }

      return HttpResponse.json({
        ...request,
        cookies,
        params,
        requestId,
        body,
        url: new URL(request.url),
        headers: headersToObject(request.headers),
      })
    },
  ),

  http.get('https://petstore3.swagger.io/api/v3/openapi.json', () =>
    HttpResponse.json(petstoreJSON),
  ),
  http.get('https://petstore3.swagger.io/api/v3/openapi.yaml', () =>
    HttpResponse.text(petstoreYAML),
  ),
)
