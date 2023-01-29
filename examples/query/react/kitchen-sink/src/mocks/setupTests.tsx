import React, { ReactNode } from 'react'
import { render } from '@testing-library/react'
import { Provider } from 'react-redux'
import { store } from '../app/store'
import {
  Route,
  createMemoryRouter,
  createRoutesFromElements,
  RouterProvider,
} from 'react-router-dom'
import { mockServer } from './mockServer'
import 'whatwg-fetch'

interface DataMemoryRouterProps {
  children?: ReactNode
  initialEntries?: string[]
}

function DataMemoryRouter({ children, initialEntries }: DataMemoryRouterProps) {
  const router = createMemoryRouter(createRoutesFromElements(children), {
    initialEntries,
  })
  return <RouterProvider router={router} />
}

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
    return render(
      <Provider store={store}>
        {path ? (
          <DataMemoryRouter initialEntries={[route]}>
            <Route path={path}>{children}</Route>
          </DataMemoryRouter>
        ) : (
          children
        )}
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
