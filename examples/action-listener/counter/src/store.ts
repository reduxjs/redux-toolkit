import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { counterSlice } from './services/counter/slice'
import {
  createActionListenerMiddleware,
  ActionListenerMiddlewareAPI,
  ActionListenerMiddleware,
} from '@rtk-incubator/action-listener-middleware'
import { themeSlice } from './services/theme/slice'
import { setupCounterListeners } from './services/counter/listeners'
import { setupThemeListeners } from './services/theme/listeners'

const actionListenerMiddleware = createActionListenerMiddleware({
  onError: () => console.error,
})

const store = configureStore({
  reducer: {
    [counterSlice.name]: counterSlice.reducer,
    [themeSlice.name]: themeSlice.reducer,
  },
  middleware: (gDM) => gDM().prepend(actionListenerMiddleware),
})

export { store }

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch

export type AppListenerApi = ActionListenerMiddlewareAPI<RootState, AppDispatch>
export type AppActionListenerMiddleware = ActionListenerMiddleware<
  RootState,
  AppDispatch
>

// Typed version of `actionListenerMiddleware`
export const appActionListener =
  actionListenerMiddleware as AppActionListenerMiddleware

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

setupCounterListeners(appActionListener)
setupThemeListeners(appActionListener)
