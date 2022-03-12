import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'
import {
  configureStore,
  createListenerMiddleware,
  TypedStartListening,
  TypedAddListener,
  ListenerEffectAPI,
  addListener,
} from '@reduxjs/toolkit'
import { counterSlice } from './services/counter/slice'
import { themeSlice } from './services/theme/slice'

const listenerMiddlewareInstance = createListenerMiddleware({
  onError: () => console.error,
})

const store = configureStore({
  reducer: {
    [counterSlice.name]: counterSlice.reducer,
    [themeSlice.name]: themeSlice.reducer,
  },
  middleware: (gDM) => gDM().prepend(listenerMiddlewareInstance.middleware),
})

export { store }

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch

export type AppListenerEffectAPI = ListenerEffectAPI<RootState, AppDispatch>

export type AppStartListening = TypedStartListening<RootState, AppDispatch>
export type AppAddListener = TypedAddListener<RootState>

export const startAppListening =
  listenerMiddlewareInstance.startListening as AppStartListening
export const addAppListener = addListener as AppAddListener

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
