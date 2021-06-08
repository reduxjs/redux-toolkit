import { createApi } from '@reduxjs/toolkit/query/react'
import { graphqlRequestBaseQuery } from './graphqlRequestBaseQuery'

export const api = createApi({
  baseQuery: graphqlRequestBaseQuery({
    url: '/graphql',
  }),
  endpoints: () => ({}),
})
