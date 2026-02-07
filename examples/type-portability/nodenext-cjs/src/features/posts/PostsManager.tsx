import React = require('react')
import ReactRedux = require('react-redux')
import ReactRouterDom = require('react-router-dom')
import postsModule = require('../../app/services/posts.js')
import authSliceModule = require('../auth/authSlice.js')
import PostDetailModule = require('./PostDetail.js')

import type { ChangeEvent, SubmitEventHandler } from 'react'
import type { Post } from '../../app/services/posts.js'

import useState = React.useState
import useDispatch = ReactRedux.useDispatch
import useSelector = ReactRedux.useSelector
import Route = ReactRouterDom.Route
import Routes = ReactRouterDom.Routes
import useNavigate = ReactRouterDom.useNavigate
import useAddPostMutation = postsModule.useAddPostMutation
import useGetErrorProneQuery = postsModule.useGetErrorProneQuery
import useGetPostsQuery = postsModule.useGetPostsQuery
import useLoginMutation = postsModule.useLoginMutation
import useGetInfinitePostsInfiniteQuery = postsModule.useGetInfinitePostsInfiniteQuery
import logout = authSliceModule.logout
import selectIsAuthenticated = authSliceModule.selectIsAuthenticated

const { PostDetail } = PostDetailModule

const AddPost = () => {
  const initialValue = { name: '' }
  const [post, setPost] = useState<Partial<Post>>(initialValue)
  const [addPost, { isLoading }] = useAddPostMutation()

  const handleChange = ({ target }: ChangeEvent<HTMLInputElement>) => {
    setPost((prev) => ({
      ...prev,
      [target.name]: target.value,
    }))
  }

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
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
  useGetInfinitePostsInfiniteQuery()
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

const PostsManager = () => {
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

export = { AddPost, PostListItem, PostList, PostsManager }
