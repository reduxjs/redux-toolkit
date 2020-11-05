import {
  configureStore,
  ThunkAction,
  Action,
  ConfigureStoreOptions
} from "@reduxjs/toolkit";
import { useDispatch } from "react-redux";
import { counterApi } from "./services/counter";
import { postApi } from "./services/posts";

export const createStore = (
  options?: ConfigureStoreOptions["preloadedState"] | undefined
) =>
  configureStore({
    reducer: {
      counterApi: counterApi.reducer,
      postsApi: postApi.reducer
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(counterApi.middleware, postApi.middleware),
    ...options
  });

export const store = createStore();

export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();
export type RootState = ReturnType<typeof store.getState>;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
