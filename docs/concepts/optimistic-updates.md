---
id: optimistic-updates
title: Optimistic Updates
sidebar_label: Optimistic Updates
hide_title: true
---

# `Optimistic Updates`

When you're performing an update on some data that _already exists_ in the cache via [`useMutation`](./mutations), RTK Query gives you a few tools to implement an optimistic update. This can be a useful pattern for when you want to give the user the impression that their changes are immediate.

The core concepts are pretty straightforward - in the `onStart` phase of a mutation, you manually set the cached data via `updateQueryResult`, and then `onError` you roll it back via `patchQueryResult`. You don't have to worry about the `onSuccess` lifecycle here.

```ts title="Example optimistic update mutation"
const api = createApi({
  baseQuery,
  entityTypes: ['Post'],
  endpoints: (build) => ({
    getPost: build.query<Post, string>({ query: (id) => `post/${id}`, provides: ['Post'] }),
    updatePost: build.mutation<void, Pick<Post, 'id'> & Partial<Post>, { undoPost: Patch[] }>({
      query: ({ id, ...patch }) => ({ url: `post/${id}`, method: 'PATCH', body: patch }),
      onStart({ id, ...patch }, { dispatch, context }) {
        context.undoPost = dispatch(
          api.util.updateQueryResult('getPost', id, (draft) => {
            Object.assign(draft, patch);
          })
        ).inversePatches;
      },
      onError({ id }, { dispatch, context }) {
        dispatch(api.util.patchQueryResult('getPost', id, context.undoPost));
      },
      invalidates: ['Post'],
    }),
  }),
});
```

### Example

[View Example](../examples/react-optimistic-updates)
