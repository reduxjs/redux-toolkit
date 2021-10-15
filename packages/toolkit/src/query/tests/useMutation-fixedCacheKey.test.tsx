import { createApi } from '@reduxjs/toolkit/query/react'
import { setupApiStore } from './helpers'
import React from 'react'
import { render, screen, getByTestId, waitFor } from '@testing-library/react'

describe('fixedCacheKey', () => {
  const api = createApi({
    baseQuery(arg: string) {
      return { data: arg }
    },
    endpoints: (build) => ({
      send: build.mutation<string, string>({
        query: (arg) => arg,
      }),
    }),
  })
  const storeRef = setupApiStore(api)

  function Component({
    name,
    fixedCacheKey,
    value = name,
  }: {
    name: string
    fixedCacheKey?: string
    value?: string
  }) {
    const [trigger, result] = api.endpoints.send.useMutation({ fixedCacheKey })

    return (
      <div data-testid={name}>
        <div data-testid="status">{result.status}</div>
        <div data-testid="data">{result.data}</div>
        <div data-testid="originalArgs">{String(result.originalArgs)}</div>
        <button data-testid="trigger" onClick={() => trigger(value)}>
          trigger
        </button>
        <button data-testid="reset" onClick={result.reset}>
          reset
        </button>
      </div>
    )
  }

  test('two mutations without `fixedCacheKey` do not influence each other', async () => {
    render(
      <>
        <Component name="C1" />
        <Component name="C2" />
      </>,
      { wrapper: storeRef.wrapper }
    )
    const c1 = screen.getByTestId('C1')
    const c2 = screen.getByTestId('C2')
    expect(getByTestId(c1, 'status').textContent).toBe('uninitialized')
    expect(getByTestId(c2, 'status').textContent).toBe('uninitialized')

    getByTestId(c1, 'trigger').click()

    await waitFor(() =>
      expect(getByTestId(c1, 'status').textContent).toBe('fulfilled')
    )
    expect(getByTestId(c1, 'data').textContent).toBe('C1')
    expect(getByTestId(c2, 'status').textContent).toBe('uninitialized')
  })

  test('two mutations with the same `fixedCacheKey` do influence each other', async () => {
    render(
      <>
        <Component name="C1" fixedCacheKey="test" />
        <Component name="C2" fixedCacheKey="test" />
      </>,
      { wrapper: storeRef.wrapper }
    )
    const c1 = screen.getByTestId('C1')
    const c2 = screen.getByTestId('C2')
    expect(getByTestId(c1, 'status').textContent).toBe('uninitialized')
    expect(getByTestId(c2, 'status').textContent).toBe('uninitialized')

    getByTestId(c1, 'trigger').click()

    await waitFor(() =>
      expect(getByTestId(c1, 'status').textContent).toBe('fulfilled')
    )
    expect(getByTestId(c1, 'data').textContent).toBe('C1')
    expect(getByTestId(c2, 'status').textContent).toBe('fulfilled')
    expect(getByTestId(c2, 'data').textContent).toBe('C1')

    // test reset from the other component
    getByTestId(c2, 'reset').click()
    expect(getByTestId(c1, 'status').textContent).toBe('uninitialized')
    expect(getByTestId(c1, 'data').textContent).toBe('')
    expect(getByTestId(c2, 'status').textContent).toBe('uninitialized')
    expect(getByTestId(c2, 'data').textContent).toBe('')
  })

  test('two mutations with different `fixedCacheKey` do not influence each other', async () => {
    render(
      <>
        <Component name="C1" fixedCacheKey="test" />
        <Component name="C2" fixedCacheKey="toast" />
      </>,
      { wrapper: storeRef.wrapper }
    )
    const c1 = screen.getByTestId('C1')
    const c2 = screen.getByTestId('C2')
    expect(getByTestId(c1, 'status').textContent).toBe('uninitialized')
    expect(getByTestId(c2, 'status').textContent).toBe('uninitialized')

    getByTestId(c1, 'trigger').click()

    await waitFor(() =>
      expect(getByTestId(c1, 'status').textContent).toBe('fulfilled')
    )
    expect(getByTestId(c1, 'data').textContent).toBe('C1')
    expect(getByTestId(c2, 'status').textContent).toBe('uninitialized')
  })

  test('unmounting and remounting keeps data intact', async () => {
    const { rerender } = render(<Component name="C1" fixedCacheKey="test" />, {
      wrapper: storeRef.wrapper,
    })
    let c1 = screen.getByTestId('C1')
    expect(getByTestId(c1, 'status').textContent).toBe('uninitialized')

    getByTestId(c1, 'trigger').click()

    await waitFor(() =>
      expect(getByTestId(c1, 'status').textContent).toBe('fulfilled')
    )
    expect(getByTestId(c1, 'data').textContent).toBe('C1')

    rerender(<div />)
    expect(screen.queryByTestId('C1')).toBe(null)

    rerender(<Component name="C1" fixedCacheKey="test" />)
    c1 = screen.getByTestId('C1')
    expect(getByTestId(c1, 'status').textContent).toBe('fulfilled')
    expect(getByTestId(c1, 'data').textContent).toBe('C1')
  })

  test('(limitation) mutations using `fixedCacheKey` do not return `originalArgs`', async () => {
    render(
      <>
        <Component name="C1" fixedCacheKey="test" />
        <Component name="C2" fixedCacheKey="test" />
      </>,
      { wrapper: storeRef.wrapper }
    )
    const c1 = screen.getByTestId('C1')
    const c2 = screen.getByTestId('C2')
    expect(getByTestId(c1, 'status').textContent).toBe('uninitialized')
    expect(getByTestId(c2, 'status').textContent).toBe('uninitialized')

    getByTestId(c1, 'trigger').click()

    await waitFor(() =>
      expect(getByTestId(c1, 'status').textContent).toBe('fulfilled')
    )
    expect(getByTestId(c1, 'data').textContent).toBe('C1')
    expect(getByTestId(c2, 'status').textContent).toBe('fulfilled')
    expect(getByTestId(c2, 'data').textContent).toBe('C1')
  })

  test('a component without `fixedCacheKey` has `originalArgs`', async () => {
    render(<Component name="C1" />, { wrapper: storeRef.wrapper })
    let c1 = screen.getByTestId('C1')
    expect(getByTestId(c1, 'status').textContent).toBe('uninitialized')
    expect(getByTestId(c1, 'originalArgs').textContent).toBe('undefined')

    getByTestId(c1, 'trigger').click()

    expect(getByTestId(c1, 'originalArgs').textContent).toBe('C1')
  })

  test('a component with `fixedCacheKey` does never have `originalArgs`', async () => {
    render(<Component name="C1" fixedCacheKey="test" />, {
      wrapper: storeRef.wrapper,
    })
    let c1 = screen.getByTestId('C1')
    expect(getByTestId(c1, 'status').textContent).toBe('uninitialized')
    expect(getByTestId(c1, 'originalArgs').textContent).toBe('undefined')

    getByTestId(c1, 'trigger').click()

    expect(getByTestId(c1, 'originalArgs').textContent).toBe('undefined')
  })
})
