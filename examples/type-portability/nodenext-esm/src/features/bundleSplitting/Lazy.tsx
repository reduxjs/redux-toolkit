import { Suspense } from 'react'
import { PostsList } from './index.js'

export const Lazy = () => {
  return (
    <Suspense fallback={<>loading...</>}>
      <PostsList />
    </Suspense>
  )
}
