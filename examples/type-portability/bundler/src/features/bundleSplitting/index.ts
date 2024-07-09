import { lazy } from 'react'

export const PostsList = lazy(() => import('./PostsList'))

export const Post = lazy(() => import('./Post'))

export { Lazy } from './Lazy'
