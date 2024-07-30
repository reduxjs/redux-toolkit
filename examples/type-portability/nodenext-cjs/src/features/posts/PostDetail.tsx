import React = require('react')
import ReactRouterDom = require('react-router-dom')
import hooksModule = require('../../app/hooks.js')
import postsModule = require('../../app/services/posts.js')
import pollingSliceModule = require('../polling/pollingSlice.js')

import type { ChangeEvent, FormEventHandler } from 'react'

import useState = React.useState
import useNavigate = ReactRouterDom.useNavigate
import useParams = ReactRouterDom.useParams
import useAppSelector = hooksModule.useAppSelector
import useDeletePostMutation = postsModule.useDeletePostMutation
import useGetPostQuery = postsModule.useGetPostQuery
import useUpdatePostMutation = postsModule.useUpdatePostMutation
import selectGlobalPollingEnabled = pollingSliceModule.selectGlobalPollingEnabled

const EditablePostName = ({
  name: initialName,
  onUpdate,
  onCancel,
  loading = false,
}: {
  name: string
  onUpdate: (name: string) => void
  onCancel: () => void
  loading?: boolean
}) => {
  const [name, setName] = useState(initialName)

  const handleChange = ({ target: { value } }: ChangeEvent<HTMLInputElement>) =>
    setName(value)

  const handleSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault()
    onUpdate(name)
  }
  const handleCancel = () => onCancel()

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          onChange={handleChange}
          value={name}
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Updating...' : 'Update'}
        </button>
        <button onClick={handleCancel} disabled={loading}>
          Cancel
        </button>
      </form>
    </div>
  )
}

const PostJsonDetail = ({ id }: { id: number }) => {
  const { data: post } = useGetPostQuery(id)

  return (
    <div className="row" style={{ background: '#eee' }}>
      <pre>{JSON.stringify(post, null, 2)}</pre>
    </div>
  )
}

const PostDetail = () => {
  const { id } = useParams<{ id: any }>()
  const navigate = useNavigate()
  const globalPolling = useAppSelector(selectGlobalPollingEnabled)

  const [isEditing, setIsEditing] = useState(false)

  const {
    data: post,
    isFetching,
    isLoading,
  } = useGetPostQuery(id, { pollingInterval: globalPolling ? 3000 : 0 })

  const [updatePost, { isLoading: isUpdating }] = useUpdatePostMutation()
  const [deletePost, { isLoading: isDeleting }] = useDeletePostMutation()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!post) {
    return <div>Missing post!</div>
  }

  return (
    <div>
      {isEditing ? (
        <EditablePostName
          name={post.name}
          onUpdate={(name) =>
            updatePost({ id, name })
              .then((result) => {
                // handle the success!
                console.log('Update Result', result)
                setIsEditing(false)
              })
              .catch((error) => console.error('Update Error', error))
          }
          onCancel={() => setIsEditing(false)}
          loading={isUpdating}
        />
      ) : (
        <div className="row">
          <div className="column">
            <h3>
              {post.name} {isFetching ? '...refetching' : ''}
            </h3>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            disabled={isDeleting || isUpdating}
          >
            {isUpdating ? 'Updating...' : 'Edit'}
          </button>
          <button
            onClick={() => deletePost(id).then(() => navigate('/posts'))}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      )}
      <PostJsonDetail id={id} />
    </div>
  )
}

export = { EditablePostName, PostJsonDetail, PostDetail }
