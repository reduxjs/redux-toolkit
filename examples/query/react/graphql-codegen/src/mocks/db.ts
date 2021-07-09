import { nanoid } from '@reduxjs/toolkit'
import { factory, primaryKey } from '@mswjs/data'
import faker from 'faker'

const postStatuses = ['draft', 'published', 'pending_review'] as const

interface Post {
  id: string
  title: string
  author: string
  content: string
  status: typeof postStatuses[number]
  created_at: string
  updated_at: string
}

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

export const handlers = db.post.toHandlers('graphql')
export const schema = db.post.toGraphQLSchema()
