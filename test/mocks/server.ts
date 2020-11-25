import { setupServer } from 'msw/node';

import { rest } from 'msw';

// This configures a request mocking server with the given request handlers.

export const server = setupServer(
  rest.get('http://example.com/success', (_, res, ctx) => res(ctx.json({ value: 'success' }))),
  rest.post('http://example.com/success', (_, res, ctx) => res(ctx.json({ value: 'success' }))),
  rest.get('http://example.com/error', (_, res, ctx) => res.once(ctx.status(500), ctx.json({ value: 'error' }))),
  rest.post('http://example.com/error', (_, res, ctx) => res.once(ctx.status(500), ctx.json({ value: 'error' }))),
  rest.get('http://example.com/mirror', (req, res, ctx) => res(ctx.json(req.params))),
  rest.post('http://example.com/mirror', (req, res, ctx) => res(ctx.json(req.params)))
);
