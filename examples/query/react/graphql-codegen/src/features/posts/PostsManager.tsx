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
import { useGetPostsQuery } from './GetPosts.generated'

const getColorForStatus = (status: string | undefined) => {
  return status === 'draft'
    ? 'gray'
    : status === 'pending_review'
      ? 'orange'
      : 'green'
}

const PostList = () => {
  const [page, setPage] = React.useState(1)
  const { data, isLoading, isFetching } = useGetPostsQuery({
    skip: page * 10,
    take: 10,
  })

  if (isLoading) {
    return <div>Loading</div>
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
        >
          <Icon as={MdArrowForward} />
        </Button>
        <Box>{`${page}`}</Box>
      </HStack>
      <List spacing={3} mt={6}>
        {data?.posts?.length ? (
          data?.posts.map(({ id, title, status }) => (
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
          ))
        ) : (
          <ListItem>No posts :(</ListItem>
        )}
      </List>
    </Box>
  )
}

export const PostsCountStat = () => {
  const { data } = useGetPostsQuery({})

  return (
    <Stat>
      <StatLabel>Total Posts</StatLabel>
      <StatNumber>{`${data?.posts?.length || 'NA'}`}</StatNumber>
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
