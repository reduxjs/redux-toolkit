# Listener Workflows

## Decision table

| Need | Reach for |
| --- | --- |
| Cached server data | RTK Query |
| One imperative async workflow with `dispatch` / `getState` | `createAsyncThunk` or a thunk |
| React to later actions or state transitions | `createListenerMiddleware` |

A good app often mixes imperative and reactive workflows. The split is by job, not by ideology.

## Useful listener helpers

- `predicate`: react to any action when a state condition becomes true
- `condition`: wait until a condition becomes true before continuing
- `take`: wait for the next matching action
- `cancelActiveListeners`: cancel older instances of the same workflow
- `fork`: start a child task

## Example: cancel stale work

```ts
startAppListening({
  actionCreator: searchRequested,
  effect: async (action, listenerApi) => {
    listenerApi.cancelActiveListeners()
    await listenerApi.delay(250)
    listenerApi.dispatch(searchStarted(action.payload))
  },
})
```

This is the kind of long-lived reactive behavior that does not fit a thunk well.
