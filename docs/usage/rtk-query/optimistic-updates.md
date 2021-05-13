---
id: optimistic-updates
title: Optimistic Updates
sidebar_label: Optimistic Updates
hide_title: true
---

# Optimistic Updates

When you're performing an update on some data that _already exists_ in the cache via [`useMutation`](./mutations), RTK Query gives you a few tools to implement an optimistic update. This can be a useful pattern for when you want to give the user the impression that their changes are immediate.

The core concepts are:

- when you start a query or mutation, `onQuery` will be executed
- you manually update the cached data by dispatching `api.util.updateQueryResult`
- then, in the case that `promiseResult` rejects, you roll it back via the `.undo` property of the object you got back from the earlier dispatch.

```ts title="Example optimistic update mutation (async await)"
const api = createApi({
  baseQuery,
  tagTypes: ['Post'],
  endpoints: (build) => ({
    getPost: build.query<Post, string>({
      query: (id) => `post/${id}`,
      providesTags: ['Post'],
    }),
    updatePost: build.mutation<
      void,
      Pick<Post, 'id'> & Partial<Post>,
      { undoPost: Patch[] }
    >({
      query: ({ id, ...patch }) => ({
        url: `post/${id}`,
        method: 'PATCH',
        body: patch,
      }),
      async onQuery({ id, ...patch }, { dispatch, resultPromise }) {
        const patchResult = dispatch(
          api.util.updateQueryResult('getPost', id, (draft) => {
            Object.assign(draft, patch)
          })
        )
        try {
          await resultPromise
        } catch {
          patchResult.undo()
        }
      }
      invalidatesTags: ['Post'],
    }),
  }),
})
```

or, if you prefer the slighty shorter version with `.catch`

```diff
-      async onQuery({ id, ...patch }, { dispatch, resultPromise }) {
+      onQuery({ id, ...patch }, { dispatch, resultPromise }) {
        const patchResult = dispatch(
          api.util.updateQueryResult('getPost', id, (draft) => {
            Object.assign(draft, patch)
          })
        )
-       try {
-         await resultPromise
-       } catch {
-         patchResult.undo()
-       }
+       resultPromise.catch(patchResult.undo)
      }
```

### Example

[View Example](./examples#react-optimistic-updates)
