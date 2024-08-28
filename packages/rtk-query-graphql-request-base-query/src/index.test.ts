import type { BaseQueryApi } from '@reduxjs/toolkit/query'
import type { GraphQLClient } from 'graphql-request'
import { ClientError } from 'graphql-request'
import { describe, expect, it, vi } from 'vitest'
import { graphqlRequestBaseQuery } from './index'

describe(graphqlRequestBaseQuery, () => {
  const mockGetState = vi.fn()
  const mockDispatch = vi.fn()
  const mockAbort = vi.fn()
  const mockExtra = {}
  const mockSignal = new AbortController().signal

  const createMockApi = (): BaseQueryApi => ({
    signal: mockSignal,
    abort: mockAbort,
    dispatch: mockDispatch,
    getState: mockGetState,
    extra: mockExtra,
    endpoint: 'testEndpoint',
    type: 'query' as const,
    forced: false,
  })

  describe('successful requests', () => {
    it('returns data on successful request', async () => {
      const mockData = { user: { id: '1', name: 'Test User' } }
      const mockClient = {
        request: vi.fn().mockResolvedValue(mockData),
      } as unknown as GraphQLClient

      const baseQuery = graphqlRequestBaseQuery({ client: mockClient })
      const result = await baseQuery(
        {
          document: 'query { user { id name } }',
          variables: {},
        },
        createMockApi(),
        {},
      )

      expect(result).toEqual({
        data: mockData,
        meta: {},
      })
      expect(mockClient.request).toHaveBeenCalledTimes(1)
    })

    it('passes variables to the GraphQL client', async () => {
      const mockData = { user: { id: '1' } }
      const mockClient = {
        request: vi.fn().mockResolvedValue(mockData),
      } as unknown as GraphQLClient

      const baseQuery = graphqlRequestBaseQuery({ client: mockClient })
      const variables = { userId: '1' }

      await baseQuery(
        {
          document: 'query($userId: ID!) { user(id: $userId) { id } }',
          variables,
        },
        createMockApi(),
        {},
      )

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          variables,
        }),
      )
    })

    it('passes document to the GraphQL client', async () => {
      const mockData = { test: 'data' }
      const mockClient = {
        request: vi.fn().mockResolvedValue(mockData),
      } as unknown as GraphQLClient

      const baseQuery = graphqlRequestBaseQuery({ client: mockClient })
      const document = 'query { test }'

      await baseQuery(
        {
          document,
        },
        createMockApi(),
        {},
      )

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          document,
        }),
      )
    })
  })

  describe('error handling', () => {
    it('returns error for ClientError (GraphQL API errors)', async () => {
      const mockError = new ClientError(
        {
          errors: [{ message: 'User not found' }],
        } as any,
        { query: 'test query' } as any,
      )

      const mockClient = {
        request: vi.fn().mockRejectedValue(mockError),
      } as unknown as GraphQLClient

      const baseQuery = graphqlRequestBaseQuery({ client: mockClient })
      const result = await baseQuery(
        {
          document: 'query { user { id } }',
        },
        createMockApi(),
        {},
      )

      expect(result).toEqual({
        error: {
          name: expect.any(String),
          message: expect.any(String),
          stack: expect.any(String),
        },
        meta: {
          request: expect.any(Object),
          response: expect.any(Object),
        },
      })
    })

    it('includes request and response in meta for ClientError', async () => {
      const mockRequest = { query: 'test query' }
      const mockResponse = { errors: [{ message: 'Error' }] }
      const mockError = new ClientError(mockResponse as any, mockRequest as any)

      const mockClient = {
        request: vi.fn().mockRejectedValue(mockError),
      } as unknown as GraphQLClient

      const baseQuery = graphqlRequestBaseQuery({ client: mockClient })
      const result = await baseQuery(
        {
          document: 'query { test }',
        },
        createMockApi(),
        {},
      )

      expect(result.meta).toHaveProperty('request')
      expect(result.meta).toHaveProperty('response')
    })

    it('returns network errors (non-ClientError) instead of throwing', async () => {
      const networkError = new Error('Network timeout')
      const mockClient = {
        request: vi.fn().mockRejectedValue(networkError),
      } as unknown as GraphQLClient

      const baseQuery = graphqlRequestBaseQuery({ client: mockClient })

      const result = await baseQuery(
        {
          document: 'query { user { id } }',
        },
        createMockApi(),
        {},
      )

      // Should return error instead of throwing
      expect(result).toEqual({
        error: {
          name: 'Error',
          message: 'Network timeout',
          stack: expect.any(String),
        },
        meta: {},
      })
    })

    it('returns fetch errors instead of throwing', async () => {
      const fetchError = new Error('Failed to fetch')
      const mockClient = {
        request: vi.fn().mockRejectedValue(fetchError),
      } as unknown as GraphQLClient

      const baseQuery = graphqlRequestBaseQuery({ client: mockClient })

      const result = await baseQuery(
        {
          document: 'query { test }',
        },
        createMockApi(),
        {},
      )

      // Should return error instead of throwing
      expect(result).toEqual({
        error: {
          name: 'Error',
          message: 'Failed to fetch',
          stack: expect.any(String),
        },
        meta: {},
      })
    })

    it('uses custom error handler when provided', async () => {
      const mockError = new ClientError(
        {
          errors: [{ message: 'Custom error' }],
        } as any,
        { query: 'test query' } as any,
      )

      const mockClient = {
        request: vi.fn().mockRejectedValue(mockError),
      } as unknown as GraphQLClient

      const customErrors = vi.fn((error: ClientError) => ({
        customField: 'custom value',
        originalMessage: error.message,
      }))

      const baseQuery = graphqlRequestBaseQuery({
        client: mockClient,
        customErrors,
      })

      const result = await baseQuery(
        {
          document: 'query { user { id } }',
        },
        createMockApi(),
        {},
      )

      expect(customErrors).toHaveBeenCalledWith(mockError)
      expect(result.error).toEqual({
        customField: 'custom value',
        originalMessage: expect.any(String),
      })
    })

    it('uses default error format when customErrors not provided', async () => {
      const mockError = new ClientError(
        {
          errors: [{ message: 'Test error' }],
        } as any,
        { query: 'test query' } as any,
      )

      const mockClient = {
        request: vi.fn().mockRejectedValue(mockError),
      } as unknown as GraphQLClient

      const baseQuery = graphqlRequestBaseQuery({ client: mockClient })
      const result = await baseQuery(
        {
          document: 'query { test }',
        },
        createMockApi(),
        {},
      )

      expect(result).toEqual({
        error: {
          name: expect.any(String),
          message: expect.any(String),
          stack: expect.any(String),
        },
        meta: {
          request: expect.any(Object),
          response: expect.any(Object),
        },
      })
    })
  })

  describe('headers', () => {
    it('applies prepareHeaders function', async () => {
      const mockData = { test: 'data' }
      const mockClient = {
        request: vi.fn().mockResolvedValue(mockData),
      } as unknown as GraphQLClient

      const prepareHeaders = vi.fn((headers: Headers) => {
        headers.set('Authorization', 'Bearer token123')
        return headers
      })

      const baseQuery = graphqlRequestBaseQuery({
        client: mockClient,
        prepareHeaders,
      })

      await baseQuery(
        {
          document: 'query { test }',
        },
        createMockApi(),
        {},
      )

      expect(prepareHeaders).toHaveBeenCalled()
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          requestHeaders: expect.any(Headers),
        }),
      )
    })

    it('passes correct arguments to prepareHeaders', async () => {
      const mockData = { test: 'data' }
      const mockClient = {
        request: vi.fn().mockResolvedValue(mockData),
      } as unknown as GraphQLClient

      const prepareHeaders = vi.fn((headers: Headers) => headers)

      const baseQuery = graphqlRequestBaseQuery({
        client: mockClient,
        prepareHeaders,
      })

      const mockApi = createMockApi()
      await baseQuery(
        {
          document: 'query { test }',
        },
        mockApi,
        {},
      )

      expect(prepareHeaders).toHaveBeenCalledWith(
        expect.any(Headers),
        expect.objectContaining({
          getState: mockApi.getState,
          endpoint: mockApi.endpoint,
          forced: mockApi.forced,
          type: mockApi.type,
          extra: mockApi.extra,
        }),
      )
    })

    it('merges requestHeaders with prepareHeaders', async () => {
      const mockData = { test: 'data' }
      const mockClient = {
        request: vi.fn().mockResolvedValue(mockData),
      } as unknown as GraphQLClient

      const prepareHeaders = vi.fn((headers: Headers) => {
        headers.set('X-Custom-Header', 'custom-value')
        return headers
      })

      const baseQuery = graphqlRequestBaseQuery({
        client: mockClient,
        requestHeaders: {
          'Content-Type': 'application/json',
        },
        prepareHeaders,
      })

      await baseQuery(
        {
          document: 'query { test }',
        },
        createMockApi(),
        {},
      )

      const callArgs = (mockClient.request as any).mock.calls[0][0]
      const headers = callArgs.requestHeaders as Headers

      expect(headers.get('Content-Type')).toBe('application/json')
      expect(headers.get('X-Custom-Header')).toBe('custom-value')
    })
  })

  describe('client initialization', () => {
    it('creates GraphQLClient from URL when client not provided', async () => {
      const mockData = { test: 'data' }

      // We can't easily test the actual client creation without mocking the constructor,
      // but we can verify the baseQuery works with a URL
      const baseQuery = graphqlRequestBaseQuery({
        url: 'https://api.example.com/graphql',
      })

      // This will fail in the test environment since there's no actual server,
      // but it verifies the configuration is accepted
      expect(baseQuery).toBeDefined()
      expect(typeof baseQuery).toBe('function')
    })

    it('uses provided client when available', async () => {
      const mockData = { test: 'data' }
      const mockClient = {
        request: vi.fn().mockResolvedValue(mockData),
      } as unknown as GraphQLClient

      const baseQuery = graphqlRequestBaseQuery({ client: mockClient })

      await baseQuery(
        {
          document: 'query { test }',
        },
        createMockApi(),
        {},
      )

      expect(mockClient.request).toHaveBeenCalled()
    })
  })

  describe('signal handling', () => {
    it('passes abort signal to GraphQL client', async () => {
      const mockData = { test: 'data' }
      const mockClient = {
        request: vi.fn().mockResolvedValue(mockData),
      } as unknown as GraphQLClient

      const baseQuery = graphqlRequestBaseQuery({ client: mockClient })
      const controller = new AbortController()

      const mockApi = {
        ...createMockApi(),
        signal: controller.signal,
      }

      await baseQuery(
        {
          document: 'query { test }',
        },
        mockApi,
        {},
      )

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          signal: controller.signal,
        }),
      )
    })
  })
})
