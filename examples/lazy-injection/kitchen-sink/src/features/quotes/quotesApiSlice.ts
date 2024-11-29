// Need to use the React-specific entry point to import `createApi`
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"
import { addAppMiddleware } from "../../app/middleware"
import type { WithSlice } from "@reduxjs/toolkit"
import { rootReducer } from "../../app/reducer"

interface Quote {
  id: number
  quote: string
  author: string
}

interface QuotesApiResponse {
  quotes: Quote[]
  total: number
  skip: number
  limit: number
}

// Define a service using a base URL and expected endpoints
export const quotesApiSlice = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: "https://dummyjson.com/quotes" }),
  reducerPath: "quotesApi",
  // Tag types are used for caching and invalidation.
  tagTypes: ["Quotes"],
  endpoints: build => ({
    // Supply generics for the return type (in this case `QuotesApiResponse`)
    // and the expected query argument. If there is no argument, use `void`
    // for the argument type instead.
    getQuotes: build.query<QuotesApiResponse, number>({
      query: (limit = 10) => `?limit=${limit}`,
      // `providesTags` determines which 'tag' is attached to the
      // cached data returned by the query.
      providesTags: (result, error, id) => [{ type: "Quotes", id }],
    }),
  }),
})

// Hooks are auto-generated by RTK-Query
// Same as `quotesApiSlice.endpoints.getQuotes.useQuery`
export const { useGetQuotesQuery } = quotesApiSlice

declare module "../../app/reducer" {
  export interface LazyLoadedSlices extends WithSlice<typeof quotesApiSlice> {}
}

const withQuotesApi = rootReducer.inject(quotesApiSlice)

// middleware typing mismatch here
// the API middleware needs a guarantee that the reducer has already been injected
// addAppMiddleware can't confirm this, but we can (the injection happens above)
// sooo... we'll just cast it to any
addAppMiddleware(quotesApiSlice.middleware as any)
