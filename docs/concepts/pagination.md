---
id: pagination
title: Pagination
sidebar_label: Pagination
hide_title: true
---

# Pagination

RTK Query makes it straightforward to integrate with a standard index-based pagination API. This is the most common form of pagination that you'll need to implement.

## Setup an endpoint to accept a page `arg`

```ts title="src/app/services/posts.ts"
import { createApi, fetchBaseQuery } from "@rtk-incubator/rtk-query";

interface ListResponse<T> {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  data: T[];
}

export const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: "/" }),
  endpoints: (builder) => ({
    listPosts: builder.query<ListResponse<Post>, number | void>({
      query: (page = 1) => `posts?page=${page}`
      }
    })
  })
});

export const { useListPostsQuery } = api;
```

## Trigger the next page by incrementing the `page` state variable

```ts title="src/features/posts/PostsManager.tsx"
const PostList = () => {
  const [page, setPage] = useState(1);
  const { data: posts, isLoading, isFetching } = useListPostsQuery(page);

  if (isLoading) {
    return <div>Loading</div>;
  }

  if (!posts?.data) {
    return <div>No posts :(</div>;
  }

  return (
    <div>
        {posts.data.map(({ id, title, status }) => (
          <div key={id}>{title} - {status}</div>
        ))}
        <button onClick={() => setPage(page - 1)} isLoading={isFetching}>
          Previous
        </button>
        <button
          onClick={() => setPage(page + 1)}
          isLoading={isFetching}
        >
         Next
        </button>
    <div>
  );
};
```

## Example

In the following example, you'll see `Loading` on the initial query, but then as you move forward we'll use the next/previous buttons as a _fetching_ indicator while any non-cached query is performed. When you go back, the cached data will be served instantaneously.

<iframe
  src="https://codesandbox.io/embed/concepts-pagination-6tjz1?fontsize=12&hidenavigation=1&theme=dark"
  style={{ width: '100%', height: '600px', border: 0, borderRadius: '4px', overflow: 'hidden' }}
  title="rtk-query-react-hooks-example"
  allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb"
  sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"
></iframe>
