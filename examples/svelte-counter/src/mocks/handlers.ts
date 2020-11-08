import { rest } from 'msw';

// high tech in-memory storage
let count = 0;

let counters = {};

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
    rest.get('/:id', (req, res, ctx) => {
        const { id } = req.params;

        const count = counters[id] || (counters[id] = 0);

        return res(ctx.json({ count }));
    }),
    rest.put<{ amount: number }>('/:id/increment', (req, res, ctx) => {
        const { amount } = req.body;
        const { id } = req.params;

        if (typeof counters[id] === 'undefined') {
            return res(ctx.json({ message: 'Counter not found' }), ctx.status(402));
        }

        const count = (counters[id] = counters[id] + amount);

        return res(ctx.json({ count }));
    }),
    rest.put<{ amount: number }>('/:id/decrement', (req, res, ctx) => {
        const { amount } = req.body;
        const { id } = req.params;

        if (typeof counters[id] === 'undefined') {
            return res(ctx.json({ message: 'Counter not found' }), ctx.status(402));
        }

        const count = (counters[id] = counters[id] - amount);

        return res(ctx.json({ count }));
    }),
];
