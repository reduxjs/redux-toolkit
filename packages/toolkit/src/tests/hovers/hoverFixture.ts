// Typical app code for `hovers.test.ts`. A `/*?<name>*/` marker sits directly
// before each identifier whose editor hover text is snapshotted.
import {
  configureStore,
  createAsyncThunk,
  createEntityAdapter,
  createListenerMiddleware,
  createSlice,
  type PayloadAction,
  type SerializedError,
} from '@reduxjs/toolkit'
import {
  createApi,
  fetchBaseQuery,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react'

export interface Post {
  id: number
  title: string
  body: string
  authorId: number
}

export interface User {
  id: string
  name: string
}

interface PostsPage {
  items: Post[]
  nextCursor: number | null
}

export const /*?api*/ api = createApi({
    reducerPath: 'api',
    baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
    tagTypes: ['Post', 'User'],
    endpoints: (build) => ({
      getPosts: build.query<Post[], void>({
        query: () => 'posts',
        providesTags: (result = []) => [
          'Post',
          ...result.map(({ id }) => ({ type: 'Post' as const, id })),
        ],
      }),
      getPost: build.query<Post, number>({
        query: (id) => `posts/${id}`,
        transformResponse: (raw: { data: Post }) => raw.data,
        providesTags: (_r, _e, id) => [{ type: 'Post', id }],
      }),
      addPost: build.mutation<Post, Omit<Post, 'id'>>({
        query: (body) => ({ url: 'posts', method: 'POST', body }),
        invalidatesTags: ['Post'],
      }),
      getPostsPage: build.infiniteQuery<PostsPage, string, number>({
        infiniteQueryOptions: {
          initialPageParam: 0,
          getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        },
        query: ({ queryArg, pageParam }) =>
          `posts?q=${queryArg}&c=${pageParam}`,
      }),
    }),
  })

export const /*?injectedApi*/ injectedApi = api.injectEndpoints({
    endpoints: (build) => ({
      getUser: build.query<User, string>({
        query: (id) => `users/${id}`,
      }),
    }),
  })

export const /*?enhancedApi*/ enhancedApi = injectedApi.enhanceEndpoints({
    addTagTypes: ['Extra'],
    endpoints: {
      getUser: { providesTags: ['User'] },
    },
  })

export const {
  /*?useGetPostsQuery*/ useGetPostsQuery,
  /*?useGetPostQuery*/ useGetPostQuery,
  /*?useAddPostMutation*/ useAddPostMutation,
  /*?useGetPostsPageInfiniteQuery*/ useGetPostsPageInfiniteQuery,
  /*?useLazyGetPostQuery*/ useLazyGetPostQuery,
} = api

export const /*?getPostEndpoint*/ getPostEndpoint = api.endpoints.getPost
export const /*?addPostEndpoint*/ addPostEndpoint = api.endpoints.addPost
export const /*?getPostSelect*/ getPostSelect = api.endpoints.getPost.select(1)
export const /*?apiUtil*/ apiUtil = api.util
export const /*?apiReducer*/ apiReducer = api.reducer
export const /*?apiMiddleware*/ apiMiddleware = api.middleware
export const /*?initiateGetPost*/ initiateGetPost =
    api.endpoints.getPost.initiate

// --- core RTK ---

export const /*?fetchUserById*/ fetchUserById = createAsyncThunk(
    'users/fetchById',
    async (userId: string) => {
      const res = await fetch(`/users/${userId}`)
      return (await res.json()) as User
    },
  )

export const /*?usersAdapter*/ usersAdapter = createEntityAdapter<User>()

interface CounterState {
  value: number
  status: 'idle' | 'loading'
}

export const /*?counterSlice*/ counterSlice = createSlice({
    name: 'counter',
    initialState: { value: 0, status: 'idle' } as CounterState,
    reducers: {
      increment: (state) => {
        state.value++
      },
      incrementBy: (state, action: PayloadAction<number>) => {
        state.value += action.payload
      },
      prepared: {
        reducer: (
          state,
          action: PayloadAction<number, string, { at: number }>,
        ) => {
          state.value = action.payload
        },
        prepare: (n: number) => ({ payload: n, meta: { at: Date.now() } }),
      },
    },
    selectors: {
      selectValue: (state) => state.value,
    },
  })

export const /*?usersSlice*/ usersSlice = createSlice({
    name: 'users',
    initialState: usersAdapter.getInitialState({ loading: false }),
    reducers: {
      userAdded: usersAdapter.addOne,
    },
    extraReducers: (builder) => {
      builder.addCase(fetchUserById.fulfilled, usersAdapter.upsertOne)
    },
  })

export const /*?listener*/ listener = createListenerMiddleware()

export const /*?store*/ store = configureStore({
    reducer: {
      counter: counterSlice.reducer,
      users: usersSlice.reducer,
      [api.reducerPath]: api.reducer,
    },
    middleware: (gDM) =>
      gDM().prepend(listener.middleware).concat(api.middleware),
  })

export type /*?RootState*/ RootState = ReturnType<typeof store.getState>
export type /*?AppDispatch*/ AppDispatch = typeof store.dispatch

export const /*?incrementBy*/ incrementBy = counterSlice.actions.incrementBy
export const /*?prepared*/ prepared = counterSlice.actions.prepared
export const /*?fulfilled*/ fulfilled = fetchUserById.fulfilled
export const /*?usersSelectors*/ usersSelectors = usersAdapter.getSelectors(
    (s: RootState) => s.users,
  )
export const /*?selectUserById*/ selectUserById = usersSelectors.selectById
export const /*?selectValue*/ selectValue = counterSlice.selectors.selectValue

export const /*?startAppListening*/ startAppListening =
    listener.startListening.withTypes<RootState, AppDispatch>()

export function Component() {
  const /*?queryResult*/ queryResult = useGetPostQuery(1)
  const { /*?data*/ data, /*?error*/ error } = queryResult
  const /*?mutationTuple*/ mutationTuple = useAddPostMutation()
  const [/*?trigger*/ trigger, /*?mutationResult*/ mutationResult] =
    mutationTuple
  const /*?infiniteResult*/ infiniteResult = useGetPostsPageInfiniteQuery('x')
  const /*?lazyTuple*/ lazyTuple = useLazyGetPostQuery()
  const /*?triggerResult*/ triggerResult = trigger({
      title: '',
      body: '',
      authorId: 1,
    })
  const /*?dispatchResult*/ dispatchResult = store.dispatch(fetchUserById('1'))
  const /*?initiateResult*/ initiateResult = store.dispatch(
      api.endpoints.getPost.initiate(1),
    )
  const /*?selectedFromResult*/ selectedFromResult = useGetPostQuery(1, {
      selectFromResult: ({ data }) => ({ title: data?.title }),
    })
  const anErr: FetchBaseQueryError | SerializedError | undefined = error
  return [
    data,
    anErr,
    mutationResult,
    infiniteResult,
    lazyTuple,
    triggerResult,
    dispatchResult,
    initiateResult,
    selectedFromResult,
  ]
}
