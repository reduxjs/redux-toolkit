import { useMemo } from 'react'
import { ActivityIndicator, FlatList, Text, View } from 'react-native-web'
import { apiWithInfiniteScroll } from '../infinite-scroll/infiniteScrollApi'
import { ProjectRow } from '../infinite-scroll/InfiniteScrollExample'

export const FlatlistExample = () => {
  const {
    data,
    error,
    fetchNextPage,
    fetchPreviousPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
    isError,
    // refetch,
  } =
    apiWithInfiniteScroll.endpoints.getProjectsCursor.useInfiniteQuery(
      'projects',
    )

  const allProjects = useMemo(() => {
    return data?.pages.flatMap((page) => page.projects) ?? []
  }, [data])

  return (
    <>
      <h2>React Native FlatList Example</h2>
      <View style={{ width: '100%', maxHeight: '600px' }}>
        {isLoading ? (
          <ActivityIndicator />
        ) : isError ? (
          <Text>{error?.message}</Text>
        ) : (
          <FlatList
            data={allProjects}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => <ProjectRow project={item} />}
            // onRefresh={refetch}
            refreshing={isLoading}
            progressViewOffset={100}
            onEndReached={() => fetchNextPage()}
          />
        )}
      </View>
    </>
  )
}
