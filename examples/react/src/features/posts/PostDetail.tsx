import React, { useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { postApi } from '../../app/services/posts';

const EditablePostName = ({
  name: initialName,
  onUpdate,
  onCancel,
  loading = false,
}: {
  name: string;
  onUpdate: (name: string) => void;
  onCancel: () => void;
  loading?: boolean;
}) => {
  const [name, setName] = useState(initialName);

  const handleChange = ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => setName(value);

  const handleUpdate = () => onUpdate(name);
  const handleCancel = () => onCancel();

  return (
    <div>
      <input type="text" onChange={handleChange} value={name} disabled={loading} />
      <button onClick={handleUpdate} disabled={loading}>
        {loading ? 'Updating...' : 'Update'}
      </button>
      <button onClick={handleCancel} disabled={loading}>
        Cancel
      </button>
    </div>
  );
};

const PostJsonDetail = ({ id }: { id: number }) => {
  const { data: post } = postApi.endpoints.getPost.useQuery(id);

  return (
    <div className="row" style={{ background: '#eee' }}>
      <pre>{JSON.stringify(post, null, 2)}</pre>
    </div>
  );
};

export const PostDetail = () => {
  const { id } = useParams<{ id: any }>();
  const { push } = useHistory();

  const [isEditing, setIsEditing] = useState(false);

  const { data: post, isFetching, isLoading } = postApi.endpoints.getPost.useQuery(id, { pollingInterval: 3000 });

  const [updatePost, { isLoading: isUpdating }] = postApi.endpoints.updatePost.useMutation();
  const [deletePost, { isLoading: isDeleting }] = postApi.endpoints.deletePost.useMutation();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!post) {
    return <div>Missing post!</div>;
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
                console.log('Update Result', result);
                setIsEditing(false);
              })
              .catch((error) => console.error('Update Error', error))
          }
          onCancel={() => setIsEditing(false)}
          loading={isUpdating}
        />
      ) : (
        <React.Fragment>
          <div className="row">
            <div className="column">
              <h3>
                {post.name} {isFetching ? '...refetching' : ''}
              </h3>
            </div>
            <button onClick={() => setIsEditing(true)} disabled={isDeleting || isUpdating}>
              {isUpdating ? 'Updating...' : 'Edit'}
            </button>
            <button onClick={() => deletePost(id).then(() => push('/posts'))} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </React.Fragment>
      )}
      <PostJsonDetail id={id} />
    </div>
  );
};
