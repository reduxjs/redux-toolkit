import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { counterActions, counterSlice } from './services/counter/slice'
import {
  createActionListenerMiddleware,
  ActionListenerMiddlewareAPI,
} from '@rtk-incubator/action-listener-middleware'
import { themeSlice, themeActions } from './services/theme/slice'
import { onChangeColorScheme } from './services/theme/listeners'
import { onIncrementByPeriodically } from './services/counter/listener'

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

export type AppListenerApi = ActionListenerMiddlewareAPI<RootState, AppDispatch>

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

actionlistener.addListener({
  predicate: themeActions.changeColorScheme.match,
  listener: onChangeColorScheme,
})

actionlistener.addListener({
  predicate: counterActions.incrementByPeriodically.match,
  // @ts-expect-error
  listener: onIncrementByPeriodically,
})
