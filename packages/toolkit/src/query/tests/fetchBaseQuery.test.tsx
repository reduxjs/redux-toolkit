import { createSlice } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query'
import { headersToObject } from 'headers-polyfill'
import { HttpResponse, delay, http } from 'msw'
import nodeFetch from 'node-fetch'
import queryString from 'query-string'
import { vi } from 'vitest'
import {
  hasBodyAndHeaders,
  isObject,
  setupApiStore,
} from '../../tests/utils/helpers'
import type { BaseQueryApi } from '../baseQueryTypes'
import { server } from './mocks/server'

const defaultHeaders: Record<string, string> = {
  fake: 'header',
  delete: 'true',
  delete2: '1',
}

const baseUrl = 'https://example.com'

// @ts-ignore
const fetchFn = vi.fn<Promise<any>, any[]>(nodeFetch)

const baseQuery = fetchBaseQuery({
  baseUrl,
  fetchFn: fetchFn as any,
  prepareHeaders: (headers, { getState }) => {
    const { token } = (getState() as RootState).auth

    // If we have a token set in state, let's assume that we should be passing it.
    if (token) {
      headers.set('authorization', `Bearer ${token}`)
    }
    // A user could customize their behavior here, so we'll just test that custom scenarios would work.
    const potentiallyConflictingKeys = Object.keys(defaultHeaders)
    potentiallyConflictingKeys.forEach((key) => {
      // Check for presence of a default key, if the incoming endpoint headers don't specify it as '', then set it
      const existingValue = headers.get(key)
      if (!existingValue && existingValue !== '') {
        headers.set(key, String(defaultHeaders[key]))
        // If an endpoint sets a header with a value of '', just delete the header.
      } else if (headers.get(key) === '') {
        headers.delete(key)
      }
    })

    return headers
  },
})

const api = createApi({
  baseQuery,
  endpoints(build) {
    return {
      query: build.query({ query: () => ({ url: '/echo', headers: {} }) }),
      mutation: build.mutation({
        query: () => ({ url: '/echo', method: 'POST', credentials: 'omit' }),
      }),
    }
  },
})

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: '',
  },
  reducers: {
    setToken(state, action) {
      state.token = action.payload
    },
  },
})

const storeRef = setupApiStore(api, { auth: authSlice.reducer })
type RootState = ReturnType<typeof storeRef.store.getState>

let commonBaseQueryApi: BaseQueryApi = {} as any
beforeEach(() => {
  const abortController = new AbortController()
  commonBaseQueryApi = {
    signal: abortController.signal,
    abort: (reason) =>
      // @ts-ignore
      abortController.abort(reason),
    dispatch: storeRef.store.dispatch,
    getState: storeRef.store.getState,
    extra: undefined,
    type: 'query',
    endpoint: 'doesntmatterhere',
  }
})

describe('fetchBaseQuery', () => {
  describe('basic functionality', () => {
    it('should return an object for a simple GET request when it is json data', async () => {
      const req = baseQuery('/success', commonBaseQueryApi, {})
      expect(req).toBeInstanceOf(Promise)
      const res = await req
      expect(res).toBeInstanceOf(Object)
      expect(res.data).toEqual({ value: 'success' })
    })

    it('should return undefined for a simple GET request when the response is empty', async () => {
      const req = baseQuery('/empty', commonBaseQueryApi, {})
      expect(req).toBeInstanceOf(Promise)
      const res = await req
      expect(res).toBeInstanceOf(Object)
      expect(res.meta?.request).toBeInstanceOf(Request)
      expect(res.meta?.response).toBeInstanceOf(Object)

      expect(res.data).toBeNull()
    })

    it('should return an error and status for error responses', async () => {
      const req = baseQuery('/error', commonBaseQueryApi, {})
      expect(req).toBeInstanceOf(Promise)
      const res = await req
      expect(res).toBeInstanceOf(Object)
      expect(res.meta?.request).toBeInstanceOf(Request)
      expect(res.meta?.response).toBeInstanceOf(Object)
      expect(res.error).toEqual({
        status: 500,
        data: { value: 'error' },
      })
    })

    it('should handle a connection loss semi-gracefully', async () => {
      fetchFn.mockRejectedValueOnce(new TypeError('Failed to fetch'))

      const req = baseQuery('/success', commonBaseQueryApi, {})
      expect(req).toBeInstanceOf(Promise)
      const res = await req
      expect(res).toBeInstanceOf(Object)
      expect(res.meta?.request).toBeInstanceOf(Request)
      expect(res.meta?.response).toBe(undefined)
      expect(res.error).toEqual({
        status: 'FETCH_ERROR',
        error: 'TypeError: Failed to fetch',
      })
    })
  })

  describe('non-JSON-body', () => {
    it('success: should return data ("text" responseHandler)', async () => {
      server.use(
        http.get(
          'https://example.com/success',
          () => HttpResponse.text(`this is not json!`),
          { once: true },
        ),
      )

      const req = baseQuery(
        { url: '/success', responseHandler: 'text' },
        commonBaseQueryApi,
        {},
      )
      expect(req).toBeInstanceOf(Promise)
      const res = await req
      expect(res).toBeInstanceOf(Object)
      expect(res.meta?.request).toBeInstanceOf(Request)
      expect(res.meta?.response).toBeInstanceOf(Object)
      expect(res.data).toEqual(`this is not json!`)
    })

    it('success: should fail gracefully (default="json" responseHandler)', async () => {
      server.use(
        http.get(
          'https://example.com/success',
          () => HttpResponse.text(`this is not json!`),
          { once: true },
        ),
      )

      const req = baseQuery('/success', commonBaseQueryApi, {})
      expect(req).toBeInstanceOf(Promise)
      const res = await req
      expect(res).toBeInstanceOf(Object)
      expect(res.meta?.request).toBeInstanceOf(Request)
      expect(res.meta?.response).toBeInstanceOf(Object)
      expect(res.error).toEqual({
        status: 'PARSING_ERROR',
        error: expect.stringMatching(/SyntaxError: Unexpected token/),
        originalStatus: 200,
        data: `this is not json!`,
      })
    })

    it('success: parse text without error ("content-type" responseHandler)', async () => {
      server.use(
        http.get(
          'https://example.com/success',
          () => HttpResponse.text(`this is not json!`),
          { once: true },
        ),
      )

      const req = baseQuery(
        {
          url: '/success',
          responseHandler: 'content-type',
        },
        commonBaseQueryApi,
        {},
      )
      expect(req).toBeInstanceOf(Promise)
      const res = await req
      expect(res).toBeInstanceOf(Object)
      expect(res.meta?.response?.headers.get('content-type')).toEqual(
        'text/plain',
      )
      expect(res.meta?.request).toBeInstanceOf(Request)
      expect(res.meta?.response).toBeInstanceOf(Object)
      expect(res.data).toEqual(`this is not json!`)
    })

    it('success: parse json without error ("content-type" responseHandler)', async () => {
      server.use(
        http.get(
          'https://example.com/success',
          () => HttpResponse.json(`this will become json!`),
          { once: true },
        ),
      )

      const req = baseQuery(
        {
          url: '/success',
          responseHandler: 'content-type',
        },
        commonBaseQueryApi,
        {},
      )
      expect(req).toBeInstanceOf(Promise)
      const res = await req
      expect(res).toBeInstanceOf(Object)
      expect(res.meta?.response?.headers.get('content-type')).toEqual(
        'application/json',
      )
      expect(res.meta?.request).toBeInstanceOf(Request)
      expect(res.meta?.response).toBeInstanceOf(Object)
      expect(res.data).toEqual(`this will become json!`)
    })

    it('server error: should fail normally with a 500 status ("text" responseHandler)', async () => {
      server.use(
        http.get('https://example.com/error', () =>
          HttpResponse.text(`this is not json!`, { status: 500 }),
        ),
      )

      const req = baseQuery(
        { url: '/error', responseHandler: 'text' },
        commonBaseQueryApi,
        {},
      )
      expect(req).toBeInstanceOf(Promise)
      const res = await req
      expect(res).toBeInstanceOf(Object)
      expect(res.meta?.request).toBeInstanceOf(Request)
      expect(res.meta?.response).toBeInstanceOf(Object)
      expect(res.error).toEqual({
        status: 500,
        data: `this is not json!`,
      })
    })

    it('server error: should fail normally with a 500 status as text ("content-type" responseHandler)', async () => {
      const serverResponse = 'Internal Server Error'
      server.use(
        http.get('https://example.com/error', () =>
          HttpResponse.text(serverResponse, { status: 500 }),
        ),
      )

      const req = baseQuery(
        { url: '/error', responseHandler: 'content-type' },
        commonBaseQueryApi,
        {},
      )
      expect(req).toBeInstanceOf(Promise)
      const res = await req
      expect(res).toBeInstanceOf(Object)
      expect(res.meta?.request).toBeInstanceOf(Request)
      expect(res.meta?.response).toBeInstanceOf(Object)
      expect(res.meta?.response?.headers.get('content-type')).toEqual(
        'text/plain',
      )
      expect(res.error).toEqual({
        status: 500,
        data: serverResponse,
      })
    })

    it('server error: should fail normally with a 500 status as json ("content-type" responseHandler)', async () => {
      const serverResponse = {
        errors: { field1: "Password cannot be 'password'" },
      }
      server.use(
        http.get('https://example.com/error', () =>
          HttpResponse.json(serverResponse, { status: 500 }),
        ),
      )

      const req = baseQuery(
        { url: '/error', responseHandler: 'content-type' },
        commonBaseQueryApi,
        {},
      )
      expect(req).toBeInstanceOf(Promise)
      const res = await req
      expect(res).toBeInstanceOf(Object)
      expect(res.meta?.request).toBeInstanceOf(Request)
      expect(res.meta?.response).toBeInstanceOf(Object)
      expect(res.meta?.response?.headers.get('content-type')).toEqual(
        'application/json',
      )
      expect(res.error).toEqual({
        status: 500,
        data: serverResponse,
      })
    })

    it('server error: should fail gracefully (default="json" responseHandler)', async () => {
      server.use(
        http.get('https://example.com/error', () =>
          HttpResponse.text(`this is not json!`, { status: 500 }),
        ),
      )

      const req = baseQuery('/error', commonBaseQueryApi, {})
      expect(req).toBeInstanceOf(Promise)
      const res = await req
      expect(res).toBeInstanceOf(Object)
      expect(res.meta?.request).toBeInstanceOf(Request)
      expect(res.meta?.response).toBeInstanceOf(Object)
      expect(res.error).toEqual({
        status: 'PARSING_ERROR',
        error: expect.stringMatching(/SyntaxError: Unexpected token/),
        originalStatus: 500,
        data: `this is not json!`,
      })
    })
  })

  describe('arg.body', () => {
    test('an object provided to body will be serialized when content-type is json', async () => {
      const data = {
        test: 'value',
      }

      const { data: request } = await baseQuery(
        { url: '/echo', body: data, method: 'POST' },
        { ...commonBaseQueryApi, type: 'mutation' },
        {},
      )

      if (!hasBodyAndHeaders(request)) {
        expect.fail('Expected request to have body and headers')
      }

      expect(request.headers['content-type']).toBe('application/json')
      expect(request.body).toEqual(data)
    })

    test('an array provided to body will be serialized when content-type is json', async () => {
      const data = ['test', 'value']

      const { data: request } = await baseQuery(
        { url: '/echo', body: data, method: 'POST' },
        commonBaseQueryApi,
        {},
      )

      if (!hasBodyAndHeaders(request)) {
        expect.fail('Expected request to have body and headers')
      }

      expect(request.headers['content-type']).toBe('application/json')
      expect(request.body).toEqual(data)
    })

    test('an object provided to body will not be serialized when content-type is not json', async () => {
      const data = {
        test: 'value',
      }

      const { data: request } = await baseQuery(
        {
          url: '/echo',
          body: data,
          method: 'POST',
          headers: { 'content-type': 'text/html' },
        },
        commonBaseQueryApi,
        {},
      )

      if (!hasBodyAndHeaders(request)) {
        expect.fail('Expected request to have body and headers')
      }

      expect(request.headers['content-type']).toBe('text/html')
      expect(request.body).toEqual('[object Object]')
    })

    test('an array provided to body will not be serialized when content-type is not json', async () => {
      const data = ['test', 'value']

      const { data: request } = await baseQuery(
        {
          url: '/echo',
          body: data,
          method: 'POST',
          headers: { 'content-type': 'text/html' },
        },
        commonBaseQueryApi,
        {},
      )

      if (!hasBodyAndHeaders(request)) {
        expect.fail('Expected request to have body and headers')
      }

      expect(request.headers['content-type']).toBe('text/html')
      expect(request.body).toEqual(data.join(','))
    })

    it('supports a custom jsonContentType', async () => {
      const baseQuery = fetchBaseQuery({
        baseUrl,
        fetchFn: fetchFn as any,
        jsonContentType: 'application/vnd.api+json',
      })

      const { data: request } = await baseQuery(
        {
          url: '/echo',
          body: {},
          method: 'POST',
        },
        commonBaseQueryApi,
        {},
      )

      if (!hasBodyAndHeaders(request)) {
        expect.fail('Expected request to have body and headers')
      }

      expect(request.headers['content-type']).toBe('application/vnd.api+json')
    })

    it('supports a custom jsonReplacer', async () => {
      const body = {
        items: new Set(['A', 'B', 'C']),
      }

      let request: any
      ;({ data: request } = await baseQuery(
        {
          url: '/echo',
          body,
          method: 'POST',
        },
        commonBaseQueryApi,
        {},
      ))

      if (!hasBodyAndHeaders(request)) {
        expect.fail('Expected request to have body and headers')
      }

      expect(request.headers['content-type']).toBe('application/json')
      expect(request.body).toEqual({ items: {} }) // Set is not properly marshalled by default

      // Use jsonReplacer
      const baseQueryWithReplacer = fetchBaseQuery({
        baseUrl,
        fetchFn: fetchFn as any,
        jsonReplacer: (key, value) =>
          value instanceof Set ? [...value] : value,
      })

      ;({ data: request } = await baseQueryWithReplacer(
        {
          url: '/echo',
          body,
          method: 'POST',
        },
        commonBaseQueryApi,
        {},
      ))

      if (!hasBodyAndHeaders(request)) {
        expect.fail('Expected request to have body and headers')
      }

      expect(request.headers['content-type']).toBe('application/json')
      expect(request.body).toEqual({ items: ['A', 'B', 'C'] }) // Set is marshalled correctly by jsonReplacer
    })
  })

  describe('arg.params', () => {
    it('should not serialize missing params', async () => {
      const { data: request } = await baseQuery(
        { url: '/echo' },
        commonBaseQueryApi,
        {},
      )

      if (!isObject(request)) {
        expect.fail('Expected request to be an object')
      }

      if (!('url' in request)) {
        expect.fail('Expected request to have url')
      }

      expect(request.url).toEqual(`${baseUrl}/echo`)
    })

    it('should serialize numeric and boolean params', async () => {
      const params = { a: 1, b: true }

      const { data: request } = await baseQuery(
        { url: '/echo', params },
        commonBaseQueryApi,
        {},
      )

      if (!isObject(request)) {
        expect.fail('Expected request to be an object')
      }

      if (!('url' in request)) {
        expect.fail('Expected request to have url')
      }

      expect(request.url).toEqual(`${baseUrl}/echo?a=1&b=true`)
    })

    it('should merge params into existing url querystring', async () => {
      const params = { a: 1, b: true }

      const { data: request } = await baseQuery(
        { url: '/echo?banana=pudding', params },
        commonBaseQueryApi,
        {},
      )

      if (!isObject(request)) {
        expect.fail('Expected request to be an object')
      }

      if (!('url' in request)) {
        expect.fail('Expected request to have url')
      }

      expect(request.url).toEqual(`${baseUrl}/echo?banana=pudding&a=1&b=true`)
    })

    it('should accept a URLSearchParams instance', async () => {
      const params = new URLSearchParams({ apple: 'fruit' })

      const { data: request } = await baseQuery(
        { url: '/echo', params },
        commonBaseQueryApi,
        {},
      )

      if (!isObject(request)) {
        expect.fail('Expected request to be an object')
      }

      if (!('url' in request)) {
        expect.fail('Expected request to have url')
      }

      expect(request.url).toEqual(`${baseUrl}/echo?apple=fruit`)
    })

    it('should strip undefined values from the end params', async () => {
      const params = { apple: 'fruit', banana: undefined, randy: null }

      const { data: request } = await baseQuery(
        { url: '/echo', params },
        commonBaseQueryApi,
        {},
      )

      if (!isObject(request)) {
        expect.fail('Expected request to be an object')
      }

      if (!('url' in request)) {
        expect.fail('Expected request to have url')
      }

      expect(request.url).toEqual(`${baseUrl}/echo?apple=fruit&randy=null`)
    })

    it('should support a paramsSerializer', async () => {
      const baseQuery = fetchBaseQuery({
        baseUrl,
        fetchFn: fetchFn as any,
        paramsSerializer: (params: Record<string, unknown>) =>
          queryString.stringify(params, { arrayFormat: 'bracket' }),
      })

      const api = createApi({
        baseQuery,
        endpoints(build) {
          return {
            query: build.query({
              query: () => ({ url: '/echo', headers: {} }),
            }),
            mutation: build.mutation({
              query: () => ({
                url: '/echo',
                method: 'POST',
                credentials: 'omit',
              }),
            }),
          }
        },
      })

      const params = {
        someArray: ['a', 'b', 'c'],
      }

      const { data: request } = await baseQuery(
        { url: '/echo', params },
        commonBaseQueryApi,
        {},
      )

      if (!isObject(request)) {
        expect.fail('Expected request to be an object')
      }

      if (!('url' in request)) {
        expect.fail('Expected request to have url')
      }

      expect(request.url).toEqual(
        `${baseUrl}/echo?someArray[]=a&someArray[]=b&someArray[]=c`,
      )
    })

    it('should supports a custom isJsonContentType function', async () => {
      const testBody = {
        i_should_be_stringified: true,
      }
      const baseQuery = fetchBaseQuery({
        baseUrl,
        fetchFn: fetchFn as any,
        isJsonContentType: (headers) =>
          [
            'application/vnd.api+json',
            'application/json',
            'application/vnd.hal+json',
          ].includes(headers.get('content-type') ?? ''),
      })

      const { data: request } = await baseQuery(
        {
          url: '/echo',
          method: 'POST',
          body: testBody,
          headers: { 'content-type': 'application/vnd.hal+json' },
        },
        commonBaseQueryApi,
        {},
      )

      if (!hasBodyAndHeaders(request)) {
        expect.fail('Expected request to have body and headers')
      }

      if (!('url' in request)) {
        expect.fail('Expected request to have url')
      }

      expect(request.body).toMatchObject(testBody)
    })
  })

  describe('validateStatus', () => {
    test('validateStatus can return an error even on normal 200 responses', async () => {
      // This is a scenario where an API may always return a 200, but indicates there is an error when success = false
      const res = await baseQuery(
        {
          url: '/nonstandard-error',
          validateStatus: (response, body) =>
            response.status === 200 && body.success === false ? false : true,
        },
        commonBaseQueryApi,
        {},
      )

      expect(res.error).toEqual({
        status: 200,
        data: {
          success: false,
          message: 'This returns a 200 but is really an error',
        },
      })
    })
  })

  describe('arg.headers and prepareHeaders', () => {
    test('uses the default headers set in prepareHeaders', async () => {
      const { data: request } = await baseQuery(
        { url: '/echo' },
        commonBaseQueryApi,
        {},
      )

      if (!isObject(request)) {
        expect.fail('Expected request to be an object')
      }

      if (!('url' in request)) {
        expect.fail('Expected request to have url')
      }

      expect(request.headers['fake']).toBe(defaultHeaders['fake'])
      expect(request.headers['delete']).toBe(defaultHeaders['delete'])
      expect(request.headers['delete2']).toBe(defaultHeaders['delete2'])
    })

    test('adds endpoint-level headers to the defaults', async () => {
      const { data: request } = await baseQuery(
        { url: '/echo', headers: { authorization: 'Bearer banana' } },
        commonBaseQueryApi,
        {},
      )

      if (!isObject(request)) {
        expect.fail('Expected request to be an object')
      }

      if (!('url' in request)) {
        expect.fail('Expected request to have url')
      }

      expect(request.headers['authorization']).toBe('Bearer banana')
      expect(request.headers['fake']).toBe(defaultHeaders['fake'])
      expect(request.headers['delete']).toBe(defaultHeaders['delete'])
      expect(request.headers['delete2']).toBe(defaultHeaders['delete2'])
    })

    test('it does not set application/json when content-type is set', async () => {
      const { data: request } = await baseQuery(
        {
          url: '/echo',
          headers: {
            authorization: 'Bearer banana',
            'content-type': 'custom-content-type',
          },
        },
        commonBaseQueryApi,
        {},
      )

      if (!isObject(request)) {
        expect.fail('Expected request to be an object')
      }

      if (!('url' in request)) {
        expect.fail('Expected request to have url')
      }

      expect(request.headers['authorization']).toBe('Bearer banana')
      expect(request.headers['content-type']).toBe('custom-content-type')
      expect(request.headers['fake']).toBe(defaultHeaders['fake'])
      expect(request.headers['delete']).toBe(defaultHeaders['delete'])
      expect(request.headers['delete2']).toBe(defaultHeaders['delete2'])
    })

    test('respects the headers from an endpoint over the base headers', async () => {
      const fake = 'fake endpoint value'

      const { data: request } = await baseQuery(
        { url: '/echo', headers: { fake, delete: '', delete2: '' } },
        commonBaseQueryApi,
        {},
      )

      if (!isObject(request)) {
        expect.fail('Expected request to be an object')
      }

      if (!('url' in request)) {
        expect.fail('Expected request to have url')
      }

      expect(request.headers['fake']).toBe(fake)
      expect(request.headers['delete']).toBeUndefined()
      expect(request.headers['delete2']).toBeUndefined()
    })

    test('prepareHeaders can return undefined', async () => {
      const token = 'accessToken'

      const _baseQuery = fetchBaseQuery({
        baseUrl,
        prepareHeaders: (headers) => {
          headers.set('authorization', `Bearer ${token}`)
        },
      })

      const doRequest = async () =>
        _baseQuery({ url: '/echo' }, commonBaseQueryApi, {})

      const { data: request } = await doRequest()

      if (!isObject(request)) {
        expect.fail('Expected request to be an object')
      }

      if (!('url' in request)) {
        expect.fail('Expected request to have url')
      }

      expect(request.headers['authorization']).toBe(`Bearer ${token}`)
    })

    test('prepareHeaders is able to be an async function', async () => {
      const token = 'accessToken'
      const getAccessTokenAsync = async () => token

      const _baseQuery = fetchBaseQuery({
        baseUrl,
        prepareHeaders: async (headers) => {
          headers.set('authorization', `Bearer ${await getAccessTokenAsync()}`)
          return headers
        },
      })

      const doRequest = async () =>
        _baseQuery({ url: '/echo' }, commonBaseQueryApi, {})

      const { data: request } = await doRequest()

      if (!isObject(request)) {
        expect.fail('Expected request to be an object')
      }

      if (!('url' in request)) {
        expect.fail('Expected request to have url')
      }

      expect(request.headers['authorization']).toBe(`Bearer ${token}`)
    })

    test('prepareHeaders is able to be an async function returning undefined', async () => {
      const token = 'accessToken'
      const getAccessTokenAsync = async () => token

      const _baseQuery = fetchBaseQuery({
        baseUrl,
        prepareHeaders: async (headers) => {
          headers.set('authorization', `Bearer ${await getAccessTokenAsync()}`)
        },
      })

      const doRequest = async () =>
        _baseQuery({ url: '/echo' }, commonBaseQueryApi, {})

      const { data: request } = await doRequest()

      if (!isObject(request)) {
        expect.fail('Expected request to be an object')
      }

      if (!('url' in request)) {
        expect.fail('Expected request to have url')
      }

      expect(request.headers['authorization']).toBe(`Bearer ${token}`)
    })

    test('prepareHeaders is able to select from a state', async () => {
      let request: any

      const doRequest = async () => {
        const abortController = new AbortController()
        return baseQuery(
          { url: '/echo' },
          {
            signal: abortController.signal,
            abort: (reason) =>
              // @ts-ignore
              abortController.abort(reason),
            dispatch: storeRef.store.dispatch,
            getState: storeRef.store.getState,
            extra: undefined,
            type: 'query',
            endpoint: '',
          },
          {},
        )
      }

      ;({ data: request } = await doRequest())

      expect(request.headers['authorization']).toBeUndefined()

      // Set a token and the follow up request should have the header injected by prepareHeaders
      const token = 'fakeToken!'
      storeRef.store.dispatch(authSlice.actions.setToken(token))
      ;({ data: request } = await doRequest())

      expect(request.headers['authorization']).toBe(`Bearer ${token}`)
    })

    test('prepareHeaders provides extra api information for getState, extra, endpoint, type and forced', async () => {
      let _getState, _arg: any, _extra, _endpoint, _type, _forced

      const baseQuery = fetchBaseQuery({
        baseUrl,
        fetchFn: fetchFn as any,
        prepareHeaders: (
          headers,
          { getState, arg, extra, endpoint, type, forced },
        ) => {
          _getState = getState
          _arg = arg
          _endpoint = endpoint
          _type = type
          _forced = forced
          _extra = extra

          return headers
        },
      })

      const fakeAuth0Client = {
        getTokenSilently: async () => 'fakeToken',
      }

      const doRequest = async () => {
        const abortController = new AbortController()
        return baseQuery(
          { url: '/echo' },
          {
            signal: abortController.signal,
            abort: (reason) =>
              // @ts-ignore
              abortController.abort(reason),
            dispatch: storeRef.store.dispatch,
            getState: storeRef.store.getState,
            extra: fakeAuth0Client,
            type: 'query',
            forced: true,
            endpoint: 'someEndpointName',
          },
          {},
        )
      }

      await doRequest()

      expect(_getState).toBeDefined()
      expect(_arg!.url).toBe('/echo')
      expect(_endpoint).toBe('someEndpointName')
      expect(_type).toBe('query')
      expect(_forced).toBe(true)
      expect(_extra).toBe(fakeAuth0Client)
    })

    test('can be instantiated with a `ExtraOptions` generic and `extraOptions` will be available in `prepareHeaders', async () => {
      const prepare = vitest.fn()
      const baseQuery = fetchBaseQuery({
        prepareHeaders(headers, api) {
          expectTypeOf(api.extraOptions).toEqualTypeOf<unknown>()
          // eslint-disable-next-line prefer-spread, prefer-rest-params
          prepare.apply(undefined, arguments as unknown as any[])
        },
      })
      baseQuery('https://example.com', commonBaseQueryApi, {
        foo: 'baz',
        bar: 5,
      })
      expect(prepare).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ extraOptions: { foo: 'baz', bar: 5 } }),
      )

      // ensure types
      createApi({
        baseQuery,
        endpoints(build) {
          return {
            testQuery: build.query({
              query: () => ({ url: '/echo', headers: {} }),
              extraOptions: {
                foo: 'asd',
                bar: 1,
              },
            }),
            testMutation: build.mutation({
              query: () => ({
                url: '/echo',
                method: 'POST',
                credentials: 'omit',
              }),
              extraOptions: {
                foo: 'qwe',
                bar: 15,
              },
            }),
          }
        },
      })
    })
  })

  test('can pass `headers` into `fetchBaseQuery`', async () => {
    const token = 'accessToken'

    const _baseQuery = fetchBaseQuery({
      baseUrl,
      headers: { authorization: `Bearer ${token}` },
    })

    const doRequest = async () =>
      _baseQuery({ url: '/echo' }, commonBaseQueryApi, {})

    const { data: request } = await doRequest()

    if (!isObject(request)) {
      expect.fail('Expected request to be an object')
    }

    if (!('url' in request)) {
      expect.fail('Expected request to have url')
    }

    expect(request.headers['authorization']).toBe(`Bearer ${token}`)
  })

  test('lets a header be undefined', async () => {
    const { data: request } = await baseQuery(
      { url: '/echo', headers: undefined },
      commonBaseQueryApi,
      {},
    )

    if (!isObject(request)) {
      expect.fail('Expected request to be an object')
    }

    if (!('url' in request)) {
      expect.fail('Expected request to have url')
    }

    expect(request.headers['fake']).toBe(defaultHeaders['fake'])
    expect(request.headers['delete']).toBe(defaultHeaders['delete'])
    expect(request.headers['delete2']).toBe(defaultHeaders['delete2'])
  })

  test('allows for possibly undefined header key/values', async () => {
    const banana = '1' as '1' | undefined

    const { data: request } = await baseQuery(
      { url: '/echo', headers: { banana } },
      commonBaseQueryApi,
      {},
    )

    if (!isObject(request)) {
      expect.fail('Expected request to be an object')
    }

    if (!('url' in request)) {
      expect.fail('Expected request to have url')
    }

    expect(request.headers['banana']).toBe('1')
    expect(request.headers['fake']).toBe(defaultHeaders['fake'])
    expect(request.headers['delete']).toBe(defaultHeaders['delete'])
    expect(request.headers['delete2']).toBe(defaultHeaders['delete2'])
  })

  test('strips undefined values from the headers', async () => {
    const banana = undefined as '1' | undefined

    const { data: request } = await baseQuery(
      { url: '/echo', headers: { banana } },
      commonBaseQueryApi,
      {},
    )

    if (!isObject(request)) {
      expect.fail('Expected request to be an object')
    }

    expect(request.headers['banana']).toBeUndefined()
    expect(request.headers['fake']).toBe(defaultHeaders['fake'])
    expect(request.headers['delete']).toBe(defaultHeaders['delete'])
    expect(request.headers['delete2']).toBe(defaultHeaders['delete2'])
  })

  describe('Accepts global arguments', () => {
    test('Global responseHandler', async () => {
      server.use(
        http.get(
          'https://example.com/success',
          () => HttpResponse.text(`this is not json!`),
          { once: true },
        ),
      )

      const globalizedBaseQuery = fetchBaseQuery({
        baseUrl,
        fetchFn: fetchFn as any,
        responseHandler: 'text',
      })

      const req = globalizedBaseQuery(
        { url: '/success' },
        commonBaseQueryApi,
        {},
      )
      expect(req).toBeInstanceOf(Promise)
      const res = await req
      expect(res).toBeInstanceOf(Object)
      expect(res.meta?.request).toBeInstanceOf(Request)
      expect(res.meta?.response).toBeInstanceOf(Object)
      expect(res.error).toBeUndefined()
      expect(res.data).toEqual(`this is not json!`)
    })

    test('Global validateStatus', async () => {
      const globalizedBaseQuery = fetchBaseQuery({
        baseUrl,
        fetchFn: fetchFn as any,
        validateStatus: (response, body) =>
          response.status === 200 && body.success === false ? false : true,
      })

      // This is a scenario where an API may always return a 200, but indicates there is an error when success = false
      const res = await globalizedBaseQuery(
        {
          url: '/nonstandard-error',
        },
        commonBaseQueryApi,
        {},
      )

      expect(res.error).toEqual({
        status: 200,
        data: {
          success: false,
          message: 'This returns a 200 but is really an error',
        },
      })
    })

    test('Global timeout', async () => {
      server.use(
        http.get(
          'https://example.com/empty1',
          async ({ request, cookies, params, requestId }) => {
            await delay(300)

            return HttpResponse.json({
              ...request,
              cookies,
              params,
              requestId,
              url: new URL(request.url),
              headers: headersToObject(request.headers),
            })
          },
          { once: true },
        ),
      )

      const globalizedBaseQuery = fetchBaseQuery({
        baseUrl,
        fetchFn: fetchFn as any,
        timeout: 200,
      })

      const result = await globalizedBaseQuery(
        { url: '/empty1' },
        commonBaseQueryApi,
        {},
      )

      expect(result?.error).toEqual({
        status: 'TIMEOUT_ERROR',
        error: expect.stringMatching(/^AbortError:/),
      })
    })
  })
})

describe('fetchFn', () => {
  test('accepts a custom fetchFn', async () => {
    const baseUrl = 'https://example.com'
    const params = new URLSearchParams({ apple: 'fruit' })

    const baseQuery = fetchBaseQuery({
      baseUrl,
      fetchFn: nodeFetch as any,
    })

    const { data: request } = await baseQuery(
      { url: '/echo', params },
      commonBaseQueryApi,
      {},
    )

    if (!isObject(request)) {
      expect.fail('Expected request to be an object')
    }

    if (!('url' in request)) {
      expect.fail('Expected request to have url')
    }

    expect(request.url).toEqual(`${baseUrl}/echo?apple=fruit`)
  })

  test('respects mocking window.fetch after a fetch base query is created', async () => {
    const baseUrl = 'https://example.com'
    const baseQuery = fetchBaseQuery({ baseUrl })

    const fakeResponse = {
      ok: true,
      status: 200,
      text: async () => `{ "url": "mock-return-url" }`,
      clone: () => fakeResponse,
    }

    const spiedFetch = vi.spyOn(window, 'fetch')
    spiedFetch.mockResolvedValueOnce(fakeResponse as any)

    const { data } = await baseQuery({ url: '/echo' }, commonBaseQueryApi, {})
    expect(data).toEqual({ url: 'mock-return-url' })

    spiedFetch.mockClear()
  })
})

describe('FormData', () => {
  test('sets the right headers when sending FormData', async () => {
    const body = new FormData()

    body.append('username', 'test')

    body.append(
      'file',
      new Blob([JSON.stringify({ hello: 'there' }, null, 2)], {
        type: 'application/json',
      }),
    )

    const res = await baseQuery(
      { url: '/echo', method: 'POST', body },
      commonBaseQueryApi,
      {},
    )

    const request: any = res.data

    expect(request.headers['content-type']).not.toContain('application/json')
  })
})

describe('still throws on completely unexpected errors', () => {
  test('', async () => {
    const error = new Error('some unexpected error')
    const req = baseQuery(
      {
        url: '/success',
        validateStatus() {
          throw error
        },
      },
      commonBaseQueryApi,
      {},
    )
    expect(req).toBeInstanceOf(Promise)
    await expect(req).rejects.toBe(error)
  })
})

describe('timeout', () => {
  test('throws a timeout error when a request takes longer than specified timeout duration', async () => {
    server.use(
      http.get(
        'https://example.com/empty2',
        async ({ request, cookies, params, requestId }) => {
          await delay(300)

          return HttpResponse.json({
            ...request,
            url: new URL(request.url),
            cookies,
            params,
            requestId,
            headers: headersToObject(request.headers),
          })
        },
        { once: true },
      ),
    )

    const result = await baseQuery(
      { url: '/empty2', timeout: 200 },
      commonBaseQueryApi,
      {},
    )

    expect(result?.error).toEqual({
      status: 'TIMEOUT_ERROR',
      error: expect.stringMatching(/^AbortError:/),
    })
  })
})
