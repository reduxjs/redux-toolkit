import * as React from 'react'
import {
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  Heading,
  HStack,
  Icon,
  List,
  ListIcon,
  ListItem,
  Spacer,
  Stat,
  StatLabel,
  StatNumber,
} from '@chakra-ui/react'
import { MdArrowBack, MdArrowForward, MdBook } from 'react-icons/md'
import { Post, useGetPostsQuery } from '../../app/services/posts'

const getColorForStatus = (status: Post['status']) => {
  return status === 'draft'
    ? 'gray'
    : status === 'pending_review'
    ? 'orange'
    : 'green'
}

const PostList = () => {
  const [page, setPage] = React.useState(1)
  const { data: posts, isLoading, isFetching } = useGetPostsQuery({ page })

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
        >
          <Icon as={MdArrowForward} />
        </Button>
        <Box>{`${page} / ${posts.total_pages}`}</Box>
      </HStack>
      <List spacing={3} mt={6}>
        {posts?.data.posts.map(({ id, title, status }) => (
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
  const { data: posts } = useGetPostsQuery({})

  return (
    <Stat>
      <StatLabel>Total Posts</StatLabel>
      <StatNumber>{`${posts?.total || 'NA'}`}</StatNumber>
    </Stat>
  )
}

export const PostsManager = () => {
  return (
    <Box>
      <Flex wrap="wrap" bg="#011627" p={4} color="white">
        <Box>
          <Heading size="xl">Manage Posts</Heading>
        </Box>
        <Spacer />
        <Box>
          <PostsCountStat />
        </Box>
      </Flex>
      <Divider />
      <Box p={4}>
        <PostList />
      </Box>
    </Box>
  )
}

export default PostsManager
