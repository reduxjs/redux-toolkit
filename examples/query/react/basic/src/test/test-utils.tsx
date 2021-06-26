import { render as rtlRender } from '@testing-library/react'
import type { RenderOptions } from '@testing-library/react'
import React, { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { DeepPartial } from 'redux'
import { setupStore } from '../store'
import type { AppStore, RootState } from '../store'

// in ./src/store.ts I have a comment asking if we can make the initialState
// parameter be DeepPartial<RootState> as opposed to just RootState
function setupStoreWithPartialState(
  initialPartialState: DeepPartial<RootState>
) {
  const state = { ...initialPartialState, ...setupStore().getState() }
  return setupStore(state)
}

// This type interface extends the default options for render from RTL, as well
// as allows the user to specify other things such as initialState, store. For
// future dependencies, such as wanting to test with react-router, you can extend
// this interface to accept a path and route and use those in a <MemoryRouter />
interface IWithStoreOptions extends Omit<RenderOptions, 'queries'> {
  initialState?: DeepPartial<RootState>
  store?: AppStore
}

function render(
  ui: React.ReactElement,
  {
    initialState = {},
    store = setupStoreWithPartialState(initialState),
    ...renderOptions
  }: IWithStoreOptions = {}
) {
  // For example, even though it's the basic project and doesn't use the components,
  // if we wanted to go ahead and set up the Chakra stuff and MemoryRouter, etc,
  // all we'd have to do is update the return in Wrapper to:
  //
  //  <Provider store={store}>
  //    <ChakraProvider>
  //      <BrowserRouter>
  //        <App />
  //      </BrowserRouter>
  //    </ChakraProvider>
  //  </Provider>
  //
  function Wrapper({ children }: PropsWithChildren<{}>): JSX.Element {
    return <Provider store={store}>{children}</Provider>
  }
  return { store, ...rtlRender(ui, { wrapper: Wrapper, ...renderOptions }) }
}

export * from '@testing-library/react'
export { render }
