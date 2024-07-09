import React = require('react')
import bundleSplittingModule = require('./index.js')
import postsModule = require('../../app/services/posts.js')

import useState = React.useState
import Post = bundleSplittingModule.Post
import postsApi = postsModule.postsApi

const PostsList = () => {
  const { data, error } = postsApi.endpoints.getPosts.useQuery()
  const [selected, select] = useState<number | undefined>()

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
  )
}

export = PostsList
