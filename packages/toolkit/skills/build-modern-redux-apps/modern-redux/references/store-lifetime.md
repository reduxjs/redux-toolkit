# Store Lifetime

## Decision table

| Environment | Default store shape | Why |
| --- | --- | --- |
| Client-only SPA | One module-level singleton store | There is one browser session and no cross-request leakage risk. |
| SSR-heavy React app | `makeStore()` plus provider-local state | Each request needs its own store instance, but that instance must stay stable across client renders. |
| Non-React integration code | Direct store access can be acceptable | This is outside the React context boundary and should stay out of UI components. |

## SPA pattern

```ts
import { configureStore } from '@reduxjs/toolkit'
import { postsSlice } from '../features/posts/postsSlice'

export const store = configureStore({
  reducer: {
    posts: postsSlice.reducer,
  },
})
```

Use this for classic browser SPAs.

## SSR-heavy React pattern

```tsx
// file: src/lib/store.ts
import { configureStore } from '@reduxjs/toolkit'
import { postsSlice } from '../features/posts/postsSlice'

export const makeStore = () =>
  configureStore({
    reducer: {
      posts: postsSlice.reducer,
    },
  })

// file: src/app/StoreProvider.tsx
'use client'

import { useState, type ReactNode } from 'react'
import { Provider } from 'react-redux'
import { makeStore } from '../lib/store'

export function StoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(makeStore)
  return <Provider store={store}>{children}</Provider>
}
```

Create the store per request, then keep it stable inside the provider component.
