//@ts-ignore
import { default as nodeFetch, Request } from 'node-fetch';
//@ts-ignore
global.fetch = nodeFetch;
//@ts-ignore
global.Request = Request;
const { server } = require('./mocks/server');

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
