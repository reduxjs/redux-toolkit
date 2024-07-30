import { lazy } from 'react'

export const PostsList = lazy(() => import('./PostsList.js'))

export const Post = lazy(() => import('./Post.js'))

export { Lazy } from './Lazy.js'
