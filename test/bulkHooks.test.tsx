import * as React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { createApi } from '../src';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { waitMs, withProvider } from './helpers';

describe('loading and fetching boolean calculations', () => {
  const api = createApi({
    baseQuery: () => waitMs(),
    endpoints: (build) => ({
      getUser: build.query<any, any>({
        query: (obj) => obj,
      }),
    }),
  });
  const store = configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (gDM) => gDM().concat(api.middleware),
  });

  test('useQuery hook sets isLoading and isFetching flags', async () => {
    function User() {
      const [value, setValue] = React.useState(0);

      const { isLoading, isFetching } = api.hooks.getUser.useQuery(1, { skip: value < 1 });

      return (
        <div>
          <div data-testid="isFetching">{String(isFetching)}</div>
          <div data-testid="isLoading">{String(isLoading)}</div>
          <button onClick={() => setValue((val) => val + 1)}>Increment value</button>
        </div>
      );
    }

    const { getByText, getByTestId, debug } = render(<User />, { wrapper: withProvider(store) });

    debug();

    // Being that we skipped the initial request on mount, both values should be false
    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('false'));
    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('false'));
    fireEvent.click(getByText('Increment value'));
    // Condition is met, both should be loading
    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('true'));
    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('true'));
    fireEvent.click(getByText('Increment value'));
    // Being that we already have data, isLoading should be false
    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('true'));
    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('false'));
    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('false'));
  });
});
