import { Suspense } from 'react'
import { PostsList } from '.'

export const Lazy = () => {
  return (
    <Suspense fallback={<>loading...</>}>
      <PostsList />
    </Suspense>
  )
}
