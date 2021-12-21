import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'
import { configureStore, Store, EnhancedStore } from '@reduxjs/toolkit'
import { counterSlice } from './services/counter/slice'
import {
  createActionListenerMiddleware,
  ActionListenerMiddlewareAPI,
} from '@rtk-incubator/action-listener-middleware'
import { themeSlice } from './services/theme/slice'
import { setupCounterListeners } from './services/counter/listeners'
import { setupThemeListeners } from './services/theme/listeners'

export const actionlistener = createActionListenerMiddleware({
  onError: () => console.error,
})

const store = configureStore({
  reducer: {
    [counterSlice.name]: counterSlice.reducer,
    [themeSlice.name]: themeSlice.reducer,
  },
  middleware: (gDM) => gDM().prepend(actionlistener),
})

export { store }

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch

export type AppListenerApiOf<ReduxStore> = ReduxStore extends EnhancedStore<
  infer State
>
  ? ActionListenerMiddlewareAPI<State, ReduxStore['dispatch']>
  : ReduxStore extends Store<infer State>
  ? ActionListenerMiddlewareAPI<State, ReduxStore['dispatch']>
  : never

export type AppListenerApi = AppListenerApiOf<typeof store>
export type AppActionListenerMiddleware = typeof actionlistener

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

setupCounterListeners(actionlistener)
setupThemeListeners(actionlistener)
