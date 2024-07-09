// import the file that injects "post" to make sure it has been loaded
import { postApi } from '../../app/services/post.js'

function assert(condition: any, msg = 'Generic Assertion'): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`)
  }
}

const Post = ({ id }: { id: number }) => {
  assert(postApi.endpoints.getPost?.useQuery, 'Endpoint `getPost` not loaded!')

  const { data, error } = postApi.endpoints.getPost.useQuery(id)

  return error ? (
    <>there was an error</>
  ) : !data ? (
    <>loading</>
  ) : (
    <h1>{data.name}</h1>
  )
}
export default Post
