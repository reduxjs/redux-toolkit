import { rest } from "msw";
import { createEntityAdapter } from "@reduxjs/toolkit";
import { Post } from "../app/services/posts";

// We're just going to use a simple in-memory store for both the counter and posts
// The entity adapter will handle modifications when triggered by the MSW handlers

let count = 0;
let startingId = 3; // Just a silly counter for usage when adding new posts

const adapter = createEntityAdapter<Post>();

let state = adapter.getInitialState();
state = adapter.setAll(state, [
  { id: 1, name: "A sample post" },
  { id: 2, name: "A post about simple query" }
]);

export { state };

export const handlers = [
  rest.put<{ amount: number }>("/increment", (req, res, ctx) => {
    const { amount } = req.body;
    count = count += amount;

    return res(ctx.json({ count }));
  }),

  rest.put<{ amount: number }>("/decrement", (req, res, ctx) => {
    const { amount } = req.body;
    count = count -= amount;

    return res(ctx.json({ count }));
  }),

  rest.get("/count", (req, res, ctx) => {
    return res(ctx.json({ count }));
  }),

  rest.get("/posts", (req, res, ctx) => {
    return res(ctx.json(Object.values(state.entities)));
  }),

  rest.post("/posts", (req, res, ctx) => {
    let post = req.body as Partial<Post>;
    startingId += 1;
    state = adapter.addOne(state, { ...post, id: startingId } as Post);
    return res(ctx.json(Object.values(state.entities)), ctx.delay(400));
  }),

  rest.get("/posts/:id", (req, res, ctx) => {
    const { id } = req.params as { id: string };

    return res(ctx.json(state.entities[id]));
  }),

  rest.put("/posts/:id", (req, res, ctx) => {
    const { id } = req.params as { id: string };
    const changes = req.body as Partial<Post>;

    state = adapter.updateOne(state, { id, changes });

    return res(ctx.json(state.entities[id]), ctx.delay(400));
  }),

  rest.delete("/posts/:id", (req, res, ctx) => {
    const { id } = req.params as { id: string };

    state = adapter.removeOne(state, id);

    return res(
      ctx.json({
        id,
        success: true
      }),
      ctx.delay(600)
    );
  })
];
