# State Ownership Heuristics

## Choose the owner, then the tool

| Kind of state | Default owner | Typical tool |
| --- | --- | --- |
| Editable form fields | Component | `useState` |
| Shared mutable app data | Redux | Slice state |
| Server cache | RTK Query | `createApi` |
| URL, pathname, search params | Router | Router APIs plus selector inputs |
| Browser-only authority like `localStorage` | External source | Read at boundaries, then dispatch events |

## Good reasons to move data into Redux

- Multiple distant parts of the UI need the same mutable data.
- You need time-travel debugging or a stable action history.
- The reducer should own transitions because they mix old store state with new inputs.

## Reasons to keep data out of Redux

- Another system already owns it, such as the router.
- It only matters during editing inside one component tree.
- It is server cache and RTK Query fits the use case better.

## Re-evaluate slice size

- If data is constantly stitched together outside reducers, it may belong closer together.
- If unrelated updates keep touching the same slice, split the slice by domain ownership.
