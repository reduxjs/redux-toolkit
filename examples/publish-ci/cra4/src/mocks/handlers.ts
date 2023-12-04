import { rest } from 'msw'
import { createEntityAdapter } from '@reduxjs/toolkit'
import { Post } from '../app/services/post'

// We're just going to use a simple in-memory store for both the counter and posts
// The entity adapter will handle modifications when triggered by the MSW handlers

const adapter = createEntityAdapter<Post>()

let state = adapter.getInitialState()
state = adapter.setAll(state, [
  { id: 1, name: 'A sample post', fetched_at: new Date().toUTCString() },
  {
    id: 2,
    name: 'A post about rtk-query',
    fetched_at: new Date().toUTCString(),
  },
])

export { state }

export const handlers = [
  rest.get('/time/:offset', (req, res, ctx) => {
    const { offset } = req.params as { offset: string }
    const date = new Date()
    const localDate = date.getTime() // users local time
    const localOffset = date.getTimezoneOffset() * 60000
    const formattedOffset = Number(offset.replace(':', '.'))
    const target = localDate + localOffset + 3600000 * formattedOffset
    return res(
      ctx.json({ time: new Date(target).toUTCString() }),
      ctx.delay(400)
    )
  }),

  rest.get('/posts/:id', (req, res, ctx) => {
    const { id: idParam } = req.params as { id: string }
    const id = parseInt(idParam, 10)
    state = adapter.updateOne(state, {
      id,
      changes: { fetched_at: new Date().toUTCString() },
    })
    return res(ctx.json(state.entities[id]), ctx.delay(400))
  }),
]
