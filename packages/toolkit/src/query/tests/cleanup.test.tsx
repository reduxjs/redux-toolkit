// tests for "cleanup-after-unsubscribe" behaviour

import React from 'react'

import { createListenerMiddleware } from '@reduxjs/toolkit'
import { createApi, QueryStatus } from '@reduxjs/toolkit/query/react'
import { render, waitFor, act, screen } from '@testing-library/react'
import { setupApiStore } from './helpers'

const api = createApi({
  baseQuery: () => ({ data: 42 }),
  endpoints: (build) => ({
    a: build.query<unknown, void>({ query: () => '' }),
    b: build.query<unknown, void>({ query: () => '' }),
  }),
})
const storeRef = setupApiStore(api)

let getSubStateA = () => storeRef.store.getState().api.queries['a(undefined)']
let getSubStateB = () => storeRef.store.getState().api.queries['b(undefined)']

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function UsingA() {
  const { data } = api.endpoints.a.useQuery()

  return <>Result: {data} </>
}

function UsingB() {
  api.endpoints.b.useQuery()

  return <></>
}

function UsingAB() {
  api.endpoints.a.useQuery()
  api.endpoints.b.useQuery()

  return <></>
}

beforeAll(() => {
  jest.useFakeTimers('legacy')
})

test('data stays in store when component stays rendered', async () => {
  expect(getSubStateA()).toBeUndefined()

  render(<UsingA />, { wrapper: storeRef.wrapper })
  await waitFor(() =>
    expect(getSubStateA()?.status).toBe(QueryStatus.fulfilled)
  )

  jest.advanceTimersByTime(120000)

  await waitFor(() =>
    expect(getSubStateA()?.status).toBe(QueryStatus.fulfilled)
  )
})

test('data is removed from store after 60 seconds', async () => {
  expect(getSubStateA()).toBeUndefined()

  const { unmount } = render(<UsingA />, { wrapper: storeRef.wrapper })
  await waitFor(() =>
    expect(getSubStateA()?.status).toBe(QueryStatus.fulfilled)
  )

  unmount()

  jest.advanceTimersByTime(59000)

  expect(getSubStateA()?.status).toBe(QueryStatus.fulfilled)

  jest.advanceTimersByTime(2000)

  expect(getSubStateA()).toBeUndefined()
})

test('data stays in store when component stays rendered while data for another component is removed after it unmounted', async () => {
  expect(getSubStateA()).toBeUndefined()
  expect(getSubStateB()).toBeUndefined()

  const { rerender } = render(
    <>
      <UsingA />
      <UsingB />
    </>,
    { wrapper: storeRef.wrapper }
  )
  await waitFor(() => {
    expect(getSubStateA()?.status).toBe(QueryStatus.fulfilled)
    expect(getSubStateB()?.status).toBe(QueryStatus.fulfilled)
  })

  const statusA = getSubStateA()

  await act(async () => {
    rerender(
      <>
        <UsingA />
      </>
    )

    jest.advanceTimersByTime(10)
  })

  jest.advanceTimersByTime(120000)

  expect(getSubStateA()).toEqual(statusA)
  expect(getSubStateB()).toBeUndefined()
})

test('data stays in store when one component requiring the data stays in the store', async () => {
  expect(getSubStateA()).toBeUndefined()
  expect(getSubStateB()).toBeUndefined()

  const { rerender } = render(
    <>
      <UsingA key="a" />
      <UsingAB key="ab" />
    </>,
    { wrapper: storeRef.wrapper }
  )
  await waitFor(() => {
    expect(getSubStateA()?.status).toBe(QueryStatus.fulfilled)
    expect(getSubStateB()?.status).toBe(QueryStatus.fulfilled)
  })

  const statusA = getSubStateA()
  const statusB = getSubStateB()

  await act(async () => {
    rerender(
      <>
        <UsingAB key="ab" />
      </>
    )
    jest.advanceTimersByTime(10)
    jest.runAllTimers()
  })

  await act(async () => {
    jest.advanceTimersByTime(120000)
    jest.runAllTimers()
  })

  expect(getSubStateA()).toEqual(statusA)
  expect(getSubStateB()).toEqual(statusB)
})

test('Minimizes the number of subscription dispatches when multiple components ask for the same data', async () => {
  const listenerMiddleware = createListenerMiddleware()
  const storeRef = setupApiStore(api, undefined, {
    middleware: [listenerMiddleware.middleware],
    withoutTestLifecycles: true,
    addAutoBatchEnhancer: true,
  })

  let subscribersTriggered = 0
  let totalListItemRenders = 0
  let totalParentComponentRenders = 0
  storeRef.store.subscribe(() => {
    subscribersTriggered += 1
  })

  let getSubscriptionsA = () =>
    storeRef.store.getState().api.subscriptions['a(undefined)']

  let actionTypes: string[] = []

  listenerMiddleware.startListening({
    predicate: () => true,
    effect: (action) => {
      actionTypes.push(action.type)
    },
  })

  const NUM_LIST_ITEMS = 5

  function UsingA() {
    totalListItemRenders++
    const { data } = api.endpoints.a.useQuery()

    return <>Result: {data} </>
  }

  function ParentComponent() {
    totalParentComponentRenders++
    const listItems = Array.from({ length: NUM_LIST_ITEMS }).map((_, i) => (
      <UsingA key={i} />
    ))

    return <>{listItems}</>
  }

  render(<ParentComponent />, {
    wrapper: storeRef.wrapper,
  })

  expect(totalListItemRenders).toBe(NUM_LIST_ITEMS * 2)
  expect(totalParentComponentRenders).toBe(1)

  const firstActions = actionTypes.slice(0, 2)
  const remainingActions = actionTypes.slice(2)
  expect(firstActions).toEqual([
    // First action is always registration
    'api/config/middlewareRegistered',
    // First list item always initiates the request
    'api/executeQuery/pending',
  ])
  expect(remainingActions.length).toBe(NUM_LIST_ITEMS - 1)
  // All remaining list items end up triggering a "rejected" action that adds a subscription
  expect(
    remainingActions.every(
      (actionType) => actionType === 'api/executeQuery/rejected'
    )
  ).toBe(true)

  // expect(actionTypes.length).toBe(2)
  // expect(subscribersTriggered).toBe(2)
  expect(subscribersTriggered).toBe(1) // N + 1 without batching

  await act(async () => {
    jest.advanceTimersByTime(10)
  })

  await waitFor(() => {
    return screen.getAllByText(/42/).length > 0
  })

  const subscriptions = getSubscriptionsA()
  expect(Object.keys(subscriptions!).length).toBe(NUM_LIST_ITEMS)
  // Expected: [
  //   'api/config/middlewareRegistered',
  //   'api/executeQuery/pending',
  //   'api/subscriptions/subscriptionRequestsRejected',
  //   'api/executeQuery/fulfilled'
  // ]
  // "registered", "pending", N-1 "rejected", "fulfilled"
  expect(actionTypes.length).toBe(NUM_LIST_ITEMS + 2)
  // expect(subscribersTriggered).toBe(4)
  // expect(actionTypes.length).toBe(1002)
  expect(subscribersTriggered).toBe(3) // N + 2 without batching
  expect(totalListItemRenders).toBe(NUM_LIST_ITEMS * 3)
  expect(totalParentComponentRenders).toBe(1)
}, 25000)
