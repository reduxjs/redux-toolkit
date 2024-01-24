import { configureStore } from '@reduxjs/toolkit'
import { ApiProvider, createApi } from '@reduxjs/toolkit/query/react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { delay } from 'msw'
import * as React from 'react'
import { Provider } from 'react-redux'

const api = createApi({
  baseQuery: async (arg: any) => {
    await delay(150)
    return { data: arg?.body ? arg.body : null }
  },
  endpoints: (build) => ({
    getUser: build.query<any, number>({
      query: (arg) => arg,
    }),
    updateUser: build.mutation<any, { name: string }>({
      query: (update) => ({ body: update }),
    }),
  }),
})

describe('ApiProvider', () => {
  test('ApiProvider allows a user to make queries without a traditional Redux setup', async () => {
    function User() {
      const [value, setValue] = React.useState(0)

      const { isFetching } = api.endpoints.getUser.useQuery(1, {
        skip: value < 1,
      })

      return (
        <div>
          <div data-testid="isFetching">{String(isFetching)}</div>
          <button onClick={() => setValue((val) => val + 1)}>
            Increment value
          </button>
        </div>
      )
    }

    const { getByText, getByTestId } = render(
      <ApiProvider api={api}>
        <User />
      </ApiProvider>
    )

    await waitFor(() =>
      expect(getByTestId('isFetching').textContent).toBe('false')
    )
    fireEvent.click(getByText('Increment value'))
    await waitFor(() =>
      expect(getByTestId('isFetching').textContent).toBe('true')
    )
    await waitFor(() =>
      expect(getByTestId('isFetching').textContent).toBe('false')
    )
    fireEvent.click(getByText('Increment value'))
    // Being that nothing has changed in the args, this should never fire.
    expect(getByTestId('isFetching').textContent).toBe('false')
  })
  test('ApiProvider throws if nested inside a Redux context', () => {
    expect(() =>
      render(
        <Provider store={configureStore({ reducer: () => null })}>
          <ApiProvider api={api}>child</ApiProvider>
        </Provider>
      )
    ).toThrowErrorMatchingInlineSnapshot(
      `[Error: Existing Redux context detected. If you already have a store set up, please use the traditional Redux setup.]`
    )
  })
})
