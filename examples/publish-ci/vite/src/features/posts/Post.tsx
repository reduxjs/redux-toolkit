import React from 'react'

// import the file that injects "post" to make sure it has been loaded
import { useGetPostQuery } from '../../app-core/services/post'

export const Post = ({ id }: { id: number }) => {
  const { data, error } = useGetPostQuery(id)
  const content = error ? (
    <>there was an error</>
  ) : !data ? (
    <>loading</>
  ) : (
    <div>
      Title:{' '}
      <b>
        <span data-testid="post-value">{data.name}</span>
      </b>
    </div>
  )

  return (
    <div>
      <h2>Post</h2>
      {content}
    </div>
  )
}
export default Post
