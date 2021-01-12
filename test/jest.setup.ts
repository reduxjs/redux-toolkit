global.fetch = require('node-fetch');

const { server } = require('./mocks/server');

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

expect.addSnapshotSerializer({
  test: (val) => typeof val === 'string',
  print: (val) => {
    return val as string;
  },
});
