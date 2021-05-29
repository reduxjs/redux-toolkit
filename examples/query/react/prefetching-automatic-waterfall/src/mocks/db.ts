import { nanoid } from '@reduxjs/toolkit'
import { factory, primaryKey } from '@mswjs/data'
import faker from 'faker'
import { Post, postStatuses } from '../app/services/posts'
import { rest } from 'msw'

const db = factory({
  post: {
    id: primaryKey(String),
    name: String,
    title: String,
    author: String,
    content: String,
    status: String,
    created_at: String,
    updated_at: String,
  },
})

const getRandomStatus = () =>
  postStatuses[Math.floor(Math.random() * postStatuses.length)]

const createPostData = (): Post => {
  const date = faker.date.past().toISOString()
  return {
    id: nanoid(),
    title: faker.lorem.words(),
    author: faker.name.findName(),
    content: faker.lorem.paragraphs(),
    status: getRandomStatus(),
    created_at: date,
    updated_at: date,
  }
}

;[...new Array(50)].forEach((_) => db.post.create(createPostData()))

export const handlers = [
  rest.get('/posts', (req, res, ctx) => {
    const page = (req.url.searchParams.get('page') || 1) as number
    const per_page = (req.url.searchParams.get('per_page') || 10) as number
    const data = db.post.findMany({
      take: per_page,
      skip: Math.max(per_page * (page - 1), 0),
    })

    return res(
      ctx.json({
        data,
        page,
        total_pages: Math.ceil(db.post.count() / per_page),
        total: db.post.count(),
      })
    )
  }),
  ...db.post.toHandlers('rest'),
] as const
