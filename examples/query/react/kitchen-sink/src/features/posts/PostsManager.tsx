import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Route, Routes, useNavigate } from 'react-router-dom'
import {
  Post,
  useAddPostMutation,
  useGetPostsQuery,
  useLoginMutation,
  useGetErrorProneQuery,
} from '../../app/services/posts'
import { selectIsAuthenticated, logout } from '../auth/authSlice'
import { PostDetail } from './PostDetail'
import './PostsManager.css'

const AddPost = () => {
  const initialValue = { name: '' }
  const [post, setPost] = useState<Partial<Post>>(initialValue)
  const [addPost, { isLoading }] = useAddPostMutation()

  const handleChange = ({ target }: React.ChangeEvent<HTMLInputElement>) => {
    setPost((prev) => ({
      ...prev,
      [target.name]: target.value,
    }))
  }

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    await addPost(post)
    setPost(initialValue)
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="row">
        <div className="column column-3">
          <input
            name="name"
            placeholder="New post name"
            type="text"
            onChange={handleChange}
            value={post.name}
          />
        </div>
        <div className="column column-1">
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Adding...' : 'Add Post'}
          </button>
        </div>
      </div>
    </form>
  )
}

const PostListItem = ({
  data: { name, id },
  onSelect,
}: {
  data: Post
  onSelect: (id: number) => void
}) => {
  return (
    <li>
      <a href="#" onClick={() => onSelect(id)}>
        {name}
      </a>
    </li>
  )
}

const PostList = () => {
  const { data: posts, isLoading } = useGetPostsQuery()
  const navigate = useNavigate()

  if (isLoading) {
    return <div>Loading</div>
  }

  if (!posts) {
    return <div>No posts :(</div>
  }

  return (
    <div>
      {posts.map((post) => (
        <PostListItem
          key={post.id}
          data={post}
          onSelect={(id) => navigate(`/posts/${id}`)}
        />
      ))}
    </div>
  )
}

export const PostsManager = () => {
  const [login] = useLoginMutation()
  const [initRetries, setInitRetries] = useState(false)
  const { data, error, isFetching } = useGetErrorProneQuery(undefined, {
    skip: !initRetries,
  })
  const dispatch = useDispatch()
  const isAuthenticated = useSelector(selectIsAuthenticated)

  return (
    <div>
      <h3>Posts</h3>
      {!isAuthenticated ? (
        <button
          onClick={() => login({ ignore: 'This will just set the headers' })}
        >
          Login
        </button>
      ) : (
        <button onClick={() => dispatch(logout())}>Logout</button>
      )}
      <button onClick={() => setInitRetries(true)}>
        {isFetching ? 'retrying...' : 'Start error prone retries'}
      </button>
      <hr />
      <div className="row">
        <div className="posts-list">
          <AddPost />
          <hr />
          Posts:
          <PostList />
          <hr />
          List with duplicate subscription:
          <PostList />
        </div>
        <div className="column column-3 text-left">
          <Routes>
            <Route path="/:id" element={<PostDetail />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

export default PostsManager
