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
  useToast,
} from '@chakra-ui/react'
import { MdBook } from 'react-icons/md'
import React, { useState } from 'react'
import { Route, Switch, useHistory } from 'react-router-dom'
import {
  Post,
  useAddPostMutation,
  useGetPostsQuery,
} from '../../app/services/posts'
import { PostDetail } from './PostDetail'

const AddPost = () => {
  const initialValue = { name: '' }
  const [post, setPost] = useState<Pick<Post, 'name'>>(initialValue)
  const [addPost, { isLoading }] = useAddPostMutation()
  const toast = useToast()

  const handleChange = ({ target }: React.ChangeEvent<HTMLInputElement>) => {
    setPost((prev) => ({
      ...prev,
      [target.name]: target.value,
    }))
  }

  const handleAddPost = async () => {
    try {
      await addPost(post).unwrap()
      setPost(initialValue)
    } catch {
      toast({
        title: 'An error occurred',
        description: "We couldn't save your post, try again!",
        status: 'error',
        duration: 2000,
        isClosable: true,
      })
    }
  }

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
  const [page, setPage] = useState(1)
  const { data: posts, isLoading, isFetching } = hooks.listPosts.useQuery(page)
  const prefetchPage = usePrefetch('listPosts')

  const prefetchNext = useCallback(() => {
    prefetchPage(page + 1)
  }, [prefetchPage, page])

  useEffect(() => {
    if (page !== posts?.total_pages) {
      prefetchNext()
    }
  }, [posts, page, prefetchNext])

  if (isLoading) {
    return <div>Loading</div>
  }

  if (!posts?.data) {
    return <div>No posts :(</div>
  }

  return (
    <Box>
      <HStack spacing="14px">
        <Button
          onClick={() => setPage((prev) => prev - 1)}
          isLoading={isFetching}
          disabled={page === 1}
        >
          <Icon as={MdArrowBack} />
        </Button>
        <Button
          onClick={() => setPage((prev) => prev + 1)}
          isLoading={isFetching}
          disabled={page === posts.total_pages}
          onMouseEnter={prefetchNext}
        >
          <Icon as={MdArrowForward} />
        </Button>
        <Box>{`${page} / ${posts.total_pages}`}</Box>
      </HStack>
      <List spacing={3} mt={6}>
        {posts?.data.map(({ id, title, status }) => (
          <ListItem key={id}>
            <ListIcon as={MdBook} color="green.500" /> {title}{' '}
            <Badge
              ml="1"
              fontSize="0.8em"
              colorScheme={getColorForStatus(status)}
            >
              {status}
            </Badge>
          </ListItem>
        ))}
      </List>
    </Box>
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
