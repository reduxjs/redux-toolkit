'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { Provider } from 'react-redux'

import type { AppStore } from '../app-core/store'
import { makeStore } from '../app-core/store'

export function StoreProvider({ children }: { children: ReactNode }) {
  // A lazy `useState` initializer creates the store exactly once per client
  // instance, without the extra null check a `useRef` in render would need.
  const [store] = useState<AppStore>(makeStore)

  return <Provider store={store}>{children}</Provider>
}
