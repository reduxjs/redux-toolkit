import { nanoid } from '@reduxjs/toolkit'
import { factory, primaryKey } from '@mswjs/data'
import faker from 'faker'
import { graphql } from 'msw'
import { postStatuses } from '../app/services/posts'
import type { Pagination, Post } from '../app/services/posts'

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

type PaginationOptions = {
  page: number; per_page: number
}

interface Posts extends Pagination {
  data: {
    posts: Post[]
  }
}

export const handlers = [
  graphql.query<Posts, PaginationOptions>('GetPosts', (req, res, ctx) => {
    const { page = 1, per_page = 10 } = req.variables

    const posts = db.post.findMany({
      take: per_page,
      skip: Math.max(per_page * (page - 1), 0)
    })

    return res(
      ctx.data({
        data: {
          posts
        } as { posts: Post[] },
        per_page,
        page,
        total_pages: Math.ceil(db.post.count() / per_page),
        total: db.post.count(),
      })
    )
  }),
  ...db.post.toHandlers('graphql'),
] as const
