import * as React from 'react';

import { Post } from '.';
import { postsApi } from '../../app/services/posts';

const PostsList = () => {
  /**
   * You can directly use the "injected" API.
   * That way all the injected endpoint are typed on there,
   * but no endpoints that were injected elsewhere will be typed.
   *
   * They *will* be available at runtime if they have been
   * injected though.
   */

  const { data, error } = postsApi.endpoints.getPosts.useQuery();
  const [selected, select] = React.useState<number | undefined>();
  return error ? (
    <>there was an error</>
  ) : !data ? (
    <>loading</>
  ) : (
    <>
      {selected && <Post id={selected} />}
      <ul>
        {data.map((post) => (
          <li key={post.id}>
            <button onClick={() => select(post.id)}>{post.name}</button>
          </li>
        ))}
      </ul>
    </>
  );
};
export default PostsList;
