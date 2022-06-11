import React from 'react'
import { render } from '@testing-library/react'
import { Provider } from 'react-redux'
import { store } from '../app/store'
import {
  unstable_HistoryRouter as HistoryRouter,
  Route,
  Routes,
} from 'react-router-dom'
import { createMemoryHistory } from 'history'
import { mockServer } from './mockServer'
import 'whatwg-fetch'

export const setupTests = () => {
  const { server, state: serverState } = mockServer()

  beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  interface RenderOptions {
    route: string
    path?: string
  }
  function renderWithProvider(
    children: React.ReactChild,
    { route, path }: RenderOptions = { route: '/', path: '' }
  ) {
    const history = createMemoryHistory()
    history.push(route)
    return render(
      <Provider store={store}>
        <HistoryRouter history={history}>
          {path ? (
            <Routes>
              <Route path={path}>{children}</Route>
            </Routes>
          ) : (
            children
          )}
        </HistoryRouter>
      </Provider>
    )
  }

  return {
    store,
    serverState,
    server,
    renderWithProvider,
  }
}
