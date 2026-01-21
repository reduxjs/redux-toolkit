import nodeFetch from 'node-fetch';
import { server } from './mocks/server';

vi.stubGlobal('fetch', nodeFetch);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
