import { api } from './api'

export const enhancedApi = api.enhanceEndpoints({
  addTagTypes: ['Post', 'User'] as const,
  endpoints: {
    getPosts: {
      providesTags: (result: Post[] | undefined) =>
        result ? result.map(({ id }) => ({ type: 'Post' as const, id })) : []
    },
    getPost(definition: QueryDefinition) {
      definition.keepUnusedDataFor = 5
    }
  }
})

export const withTagList = api.enhanceEndpoints({
  addTagTypes: ['Post', 'User']
})
