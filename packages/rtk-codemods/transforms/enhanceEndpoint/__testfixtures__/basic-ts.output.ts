import { api } from './api'

export const enhancedApi = api.addTagTypes('Post', 'User').enhanceEndpoint('getPosts', {
  providesTags: (result: Post[] | undefined) =>
    result ? result.map(({ id }) => ({ type: 'Post' as const, id })) : []
}).enhanceEndpoint('getPost', (definition: QueryDefinition) => {
  definition.keepUnusedDataFor = 5
})

export const withTagList = api.addTagTypes('Post', 'User')
