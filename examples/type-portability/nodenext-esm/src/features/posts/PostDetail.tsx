import type { ChangeEvent, FormEventHandler } from 'react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppSelector } from '../../app/hooks.js'
import {
  useDeletePostMutation,
  useGetPostQuery,
  useUpdatePostMutation,
} from '../../app/services/posts.js'
import { selectGlobalPollingEnabled } from '../polling/pollingSlice.js'

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

export const PostDetail = () => {
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
