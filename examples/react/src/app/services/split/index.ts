import { createApi, fetchBaseQuery, ApiWithInjectedEndpoints } from '@rtk-incubator/rtk-query';

export interface Post {
  id: number;
  name: string;
}

export type PostsResponse = Post[];

export const emptySplitApi = createApi({
  reducerPath: 'splitApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  entityTypes: ['Posts'],
  endpoints: () => ({}),
});

export const splitApi = emptySplitApi as ApiWithInjectedEndpoints<
  typeof emptySplitApi,
  [
    // these are only type imports, no runtime imports -> no bundle dependence
    typeof import('./posts').apiWithPosts,
    typeof import('./post').apiWithPost
  ]
>;
