import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from '../app/store';
import { Router, Route } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { mockServer } from './mockServer';
import 'whatwg-fetch';

export const setupTests = () => {
  const { server, state: serverState } = mockServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  interface RenderOptions {
    route: string;
    path?: string;
  }
  function renderWithProvider(children: React.ReactChild, { route, path }: RenderOptions = { route: '/', path: '' }) {
    const history = createMemoryHistory();
    history.push(route);
    return render(
      <Provider store={store}>
        <Router history={history}>{path ? <Route path={path}>{children}</Route> : children}</Router>
      </Provider>
    );
  }

  return {
    store,
    serverState,
    server,
    renderWithProvider,
  };
};
