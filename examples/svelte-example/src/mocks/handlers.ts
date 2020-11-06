import { rest } from 'msw';

// high tech in-memory storage
let count = 0;

export const handlers = [
    rest.put<{ amount: number }>('/increment', (req, res, ctx) => {
        const { amount } = req.body;
        count = count += amount;

        return res(ctx.json({ count }));
    }),
    rest.put<{ amount: number }>('/decrement', (req, res, ctx) => {
        const { amount } = req.body;
        count = count -= amount;

        return res(ctx.json({ count }));
    }),
    rest.get('/count', (req, res, ctx) => {
        return res(ctx.json({ count }));
    }),
];
