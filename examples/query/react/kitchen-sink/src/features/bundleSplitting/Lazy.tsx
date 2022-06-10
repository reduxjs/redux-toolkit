import * as React from 'react'
import { PostsList } from '.'

export const Lazy = () => {
  return (
    <React.Suspense fallback={<>loading...</>}>
      <PostsList />
    </React.Suspense>
  )
}
