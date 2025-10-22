import { factory, primaryKey } from '@mswjs/data'
import { nanoid } from '@reduxjs/toolkit'
import { rest } from 'msw'
import type { Post } from '../app/services/posts'

const db = factory({
  post: {
    id: primaryKey(String),
    name: String,
  },
})

;[
  'A sample post',
  'A post about RTK Query',
  'How to randomly throw errors, a novella',
].forEach((name) => {
  db.post.create({ id: nanoid(), name })
})

export const handlers = [
  rest.post('/posts', async (req, res, ctx) => {
    const { name } = req.body as Partial<Post>

    if (Math.random() < 0.3) {
      return res(
        ctx.json({ error: 'Oh no, there was an error, try again.' }),
        ctx.status(500),
        ctx.delay(300),
      )
    }

    const post = db.post.create({
      id: nanoid(),
      name,
    })

    return res(ctx.json(post), ctx.delay(300))
  }),
  rest.put('/posts/:id', (req, res, ctx) => {
    const { name } = req.body as Partial<Post>

    if (Math.random() < 0.3) {
      return res(
        ctx.json({ error: 'Oh no, there was an error, try again.' }),
        ctx.status(500),
        ctx.delay(300),
      )
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id

    const post = db.post.update({
      where: {
        id: {
          equals: id,
        },
      },
      data: { name },
    })

    return res(ctx.json(post), ctx.delay(300))
  }),
  ...db.post.toHandlers('rest'),
] as const
