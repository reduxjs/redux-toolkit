'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'

export function MswProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { worker } = await import('../mocks/browser')
      await worker.start()
      if (!cancelled) setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return <>{ready && children}</>
}
