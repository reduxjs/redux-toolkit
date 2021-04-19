import React, { useCallback, useState } from 'react';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Route, Switch, useHistory } from 'react-router-dom';
import {
  Post,
  useAddPostMutation,
  useGetPostsQuery,
  useLoginMutation,
  useGetErrorProneQuery,
  postApi,
} from '../../app/services/posts';
import { selectIsAuthenticated, logout } from '../auth/authSlice';
import { PostDetail } from './PostDetail';
import './PostsManager.css';

const AddPost = () => {
  const initialValue = { name: '' };
  const [post, setPost] = useState<Partial<Post>>(initialValue);
  const [addPost, { isLoading }] = useAddPostMutation();

  const handleChange = ({ target }: React.ChangeEvent<HTMLInputElement>) => {
    setPost((prev) => ({
      ...prev,
      [target.name]: target.value,
    }));
  };

  const handleAddPost = () =>
    addPost(post)
      .unwrap()
      .then(() => setPost(initialValue));

  return (
    <div className="row">
      <div className="column column-3">
        <input name="name" placeholder="New post name" type="text" onChange={handleChange} value={post.name} />
      </div>
      <div className="column column-1">
        <button onClick={handleAddPost} disabled={isLoading}>
          {isLoading ? 'Adding...' : 'Add Post'}
        </button>
      </div>
    </div>
  );
};

const PostListItem = ({ data: { name, id }, onSelect }: { data: Post; onSelect: (id: number) => void }) => {
  return (
    <li>
      <a href="#" onClick={() => onSelect(id)}>
        {name}
      </a>
    </li>
  );
};

const PostList = () => {
  // const { data: posts, isLoading } = useGetPostsQuery();
  const [getPosts, { data: posts, isLoading, isFetching }] = postApi.endpoints['getPosts'].useLazyQuery();

  const { push } = useHistory();

  if (isLoading) {
    return <div>Loading</div>;
  }

  if (!posts) {
    return (
      <div>
        No posts :({' '}
        <button onClick={() => getPosts()} disabled={isFetching}>
          {isFetching ? 'Fetching...' : 'Fetch them'}
        </button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => getPosts()}> {isFetching ? 'Fetching...' : 'Refetch posts'}</button>
      {posts.map((post) => (
        <PostListItem key={post.id} data={post} onSelect={(id) => push(`/posts/${id}`)} />
      ))}
    </div>
  );
};

const PostFromUseQueryStateSelectFromResult = () => {
  const [count, setCount] = useState(0);
  const id = 5;
  const idAsString = String(id);

  const post = postApi.endpoints.getPosts.useQueryState(undefined, {
    selectFromResult: ({ data }) => data?.find((entry) => entry.id === id),
  });

  useEffect(() => {
    setCount((prev) => prev + 1);
  }, [post]);

  return (
    <div>
      <h3>
        This won't render a post until `id: {idAsString}` exists! <small>(render count: {count})</small>
      </h3>
      {post ? <div>{JSON.stringify(post)}</div> : <div>waiting to see id: {idAsString}</div>}
    </div>
  );
};

const PostFromUseQuerySelectFromResult = () => {
  const [count, setCount] = useState(0);
  const id = 6;
  const idAsString = String(id);
  const { refetch, post } = postApi.useGetPostsQuery(undefined, {
    selectFromResult: ({ data }) => ({ post: data?.find((entry) => entry.id === id) }),
  });

  useEffect(() => {
    setCount((prev) => prev + 1);
  }, [post]);

  return (
    <div>
      <h3>
        This won't render a post until `id: {idAsString}` exists! <small>(render count: {count})</small>
      </h3>
      {post ? <div>{JSON.stringify(post)}</div> : <div>waiting to see id: {idAsString}</div>}
    </div>
  );
};

export const PostsManager = () => {
  const [login] = useLoginMutation();
  const [initRetries, setInitRetries] = useState(false);
  const { data, error, isFetching } = useGetErrorProneQuery(undefined, { skip: !initRetries });
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);

  return (
    <div>
      <h3>Posts</h3>
      {!isAuthenticated ? (
        <button onClick={() => login({ ignore: 'This will just set the headers' })}>Login</button>
      ) : (
        <button onClick={() => dispatch(logout())}>Logout</button>
      )}
      <button onClick={() => setInitRetries(true)}>{isFetching ? 'retrying...' : 'Start error prone retries'}</button>
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
          <Switch>
            <Route path="/posts/:id" component={PostDetail} />
          </Switch>

          <div style={{ marginTop: 0, paddingTop: 20, borderTop: '1px solid #eee' }}>
            If you look, these components will only rerender when the the selector criteria is met, or when the actual
            underlying data changes. Try adding a few new posts to see this behavior.
            <PostFromUseQueryStateSelectFromResult />
            <hr />
            <PostFromUseQuerySelectFromResult />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostsManager;
