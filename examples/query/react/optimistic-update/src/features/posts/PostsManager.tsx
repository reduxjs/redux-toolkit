import {
  Box,
  Button,
  Center,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  List,
  ListIcon,
  ListItem,
  Spacer,
  Stat,
  StatLabel,
  StatNumber,
} from '@chakra-ui/react'
import { MdBook } from 'react-icons/md'
import React, { useState } from 'react'
import { Route, Switch, useHistory } from 'react-router-dom'
import {
  Post,
  useAddPostMutation,
  useGetPostQuery,
  useGetPostsQuery,
} from '../../app/services/posts'
import { PostDetail } from './PostDetail'
import { v4 as uuid } from 'uuid'

const AddPost = () => {
  const initialValue: Post = { id: uuid(), name: '' }
  const [post, setPost] = useState(initialValue)
  const [addPost, { isLoading }] = useAddPostMutation()

  const handleChange = ({ target }: React.ChangeEvent<HTMLInputElement>) => {
    setPost((prev) => ({
      ...prev,
      [target.name]: target.value,
    }))
  }

  const handleAddPost = () => addPost(post).then(() => setPost(initialValue))

  return (
    <Flex p={5}>
      <Box flex={10}>
        <FormControl isInvalid={Boolean(post.name.length < 3 && post.name)}>
          <FormLabel htmlFor="name">Post name</FormLabel>
          <Input
            id="name"
            name="name"
            placeholder="Enter post name"
            value={post.name}
            onChange={handleChange}
          />
        </FormControl>
      </Box>
      <Spacer />
      <Box>
        <Button
          mt={8}
          colorScheme="purple"
          isLoading={isLoading}
          onClick={handleAddPost}
        >
          Add Post
        </Button>
      </Box>
    </Flex>
  )
}

const PostList = () => {
  const { data: posts, isLoading } = useGetPostsQuery()
  const { push } = useHistory()

  if (isLoading) {
    return <div>Loading</div>
  }

  if (!posts) {
    return <div>No posts :(</div>
  }

  return (
    <List spacing={3}>
      {posts.map(({ id, name }) => (
        <ListItem key={id} onClick={() => push(`/posts/${id}`)}>
          <ListIcon as={MdBook} color="green.500" /> {name}
        </ListItem>
      ))}
    </List>
  )
}

const PostNameSubscribed = ({ id }: { id: string }) => {
  const { data, isFetching } = useGetPostQuery(id)
  const { push } = useHistory()

  console.log('data', data, isFetching)

  if (!data) return null

  return (
    <ListItem key={id} onClick={() => push(`/posts/${id}`)}>
      <ListIcon as={MdBook} color="green.500" /> {data.name}
    </ListItem>
  )
}
const PostListSubscribed = () => {
  const { data: posts, isLoading } = useGetPostsQuery()

  if (isLoading) {
    return <div>Loading</div>
  }

  if (!posts) {
    return <div>No posts :(</div>
  }

  return (
    <List spacing={3}>
      {posts.map(({ id }) => (
        <PostNameSubscribed id={id} key={id} />
      ))}
    </List>
  )
}

export const PostsCountStat = () => {
  const { data: posts } = useGetPostsQuery()

  if (!posts) return null

  return (
    <Stat>
      <StatLabel>Active Posts</StatLabel>
      <StatNumber>{posts?.length}</StatNumber>
    </Stat>
  )
}

export const PostsManager = () => {
  return (
    <Box>
      <Flex bg="#011627" p={4} color="white">
        <Box>
          <Heading size="xl">Manage Posts</Heading>
        </Box>
        <Spacer />
        <Box>
          <PostsCountStat />
        </Box>
      </Flex>
      <Divider />
      <AddPost />
      <Divider />
      <Flex wrap="wrap">
        <Box flex={1} borderRight="1px solid #eee">
          <Box p={4} borderBottom="1px solid #eee">
            <Heading size="sm">Posts</Heading>
          </Box>
          <Box p={4}>
            <PostList />
          </Box>
          <Box p={4} borderBottom="1px solid #eee">
            <Heading size="sm">Posts (subscribed)</Heading>
          </Box>
          <Box p={4}>
            <PostListSubscribed />
          </Box>
        </Box>
        <Box flex={2}>
          <Switch>
            <Route path="/posts/:id" component={PostDetail} />
            <Route>
              <Center h="200px">
                <Heading size="md">Select a post to edit!</Heading>
              </Center>
            </Route>
          </Switch>
        </Box>
      </Flex>
    </Box>
  )
}

export default PostsManager
