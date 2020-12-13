import { setupServer } from 'msw/node';
import { rest } from 'msw';

// This configures a request mocking server with the given request handlers.

export const server = setupServer(
  rest.get('http://example.com/echo', (req, res, ctx) =>
    res(ctx.json({ ...req, headers: req.headers.getAllHeaders() }))
  ),
  rest.post('http://example.com/echo', (req, res, ctx) =>
    res(ctx.json({ ...req, headers: req.headers.getAllHeaders() }))
  ),
  rest.get('http://example.com/success', (_, res, ctx) => res(ctx.json({ value: 'success' }))),
  rest.post('http://example.com/success', (_, res, ctx) => res(ctx.json({ value: 'success' }))),
  rest.get('http://example.com/empty', (_, res, ctx) => res(ctx.body(''))),
  rest.get('http://example.com/error', (_, res, ctx) => res.once(ctx.status(500), ctx.json({ value: 'error' }))),
  rest.post('http://example.com/error', (_, res, ctx) => res.once(ctx.status(500), ctx.json({ value: 'error' }))),
  rest.get('http://example.com/nonstandard-error', (_, res, ctx) =>
    res(ctx.status(200), ctx.json({ success: false, message: 'This returns a 200 but is really an error' }))
  ),
  rest.get('http://example.com/mirror', (req, res, ctx) => res(ctx.json(req.params))),
  rest.post('http://example.com/mirror', (req, res, ctx) => res(ctx.json(req.params)))
);
