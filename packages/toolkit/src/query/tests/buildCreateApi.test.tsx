import * as React from 'react'
import type { ReactReduxContextValue } from 'react-redux'
import {
  createDispatchHook,
  createSelectorHook,
  createStoreHook,
  Provider,
} from 'react-redux'
import {
  buildCreateApi,
  coreModule,
  reactHooksModule,
} from '@reduxjs/toolkit/query/react'
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  renderHook,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { rest } from 'msw'
import {
  actionsReducer,
  ANY,
  expectExactType,
  expectType,
  setupApiStore,
  withProvider,
  useRenderCounter,
  waitMs,
} from './helpers'
import { server } from './mocks/server'
import type { UnknownAction } from 'redux'
import type { SubscriptionOptions } from '@reduxjs/toolkit/dist/query/core/apiState'
import type { SerializedError } from '@reduxjs/toolkit'
import { createListenerMiddleware, configureStore } from '@reduxjs/toolkit'
import { delay } from '../../utils'

const MyContext = React.createContext<ReactReduxContextValue>(null as any)

describe('buildCreateApi', () => {
  test('Works with all hooks provided', async () => {
    const customCreateApi = buildCreateApi(
      coreModule(),
      reactHooksModule({
        hooks: {
          useDispatch: createDispatchHook(MyContext),
          useSelector: createSelectorHook(MyContext),
          useStore: createStoreHook(MyContext),
        },
      })
    )

    const api = customCreateApi({
      baseQuery: async (arg: any) => {
        await waitMs()

        return {
          data: arg?.body ? { ...arg.body } : {},
        }
      },
      endpoints: (build) => ({
        getUser: build.query<{ name: string }, number>({
          query: () => ({
            body: { name: 'Timmy' },
          }),
        }),
      }),
    })

    let getRenderCount: () => number = () => 0

    const storeRef = setupApiStore(api, {}, { withoutTestLifecycles: true })

    // Copy of 'useQuery hook basic render count assumptions' from `buildHooks.test.tsx`
    function User() {
      const { isFetching } = api.endpoints.getUser.useQuery(1)
      getRenderCount = useRenderCounter()

      return (
        <div>
          <div data-testid="isFetching">{String(isFetching)}</div>
        </div>
      )
    }

    function Wrapper({ children }: any) {
      return (
        <Provider store={storeRef.store} context={MyContext}>
          {children}
        </Provider>
      )
    }

    render(<User />, { wrapper: Wrapper })
    // By the time this runs, the initial render will happen, and the query
    //  will start immediately running by the time we can expect this
    expect(getRenderCount()).toBe(2)

    await waitFor(() =>
      expect(screen.getByTestId('isFetching').textContent).toBe('false')
    )
    expect(getRenderCount()).toBe(3)
  })

  test("Throws an error if you don't provide all hooks", async () => {
    const callBuildCreateApi = () => {
      const customCreateApi = buildCreateApi(
        coreModule(),
        reactHooksModule({
          // @ts-ignore
          hooks: {
            useDispatch: createDispatchHook(MyContext),
            useSelector: createSelectorHook(MyContext),
          },
        })
      )
    }

    expect(callBuildCreateApi).toThrowErrorMatchingInlineSnapshot(
      `"When using custom hooks for context, all 3 hooks need to be provided: useDispatch, useSelector, useStore.\nHook useStore was either not provided or not a function."`
    )
  })
})
