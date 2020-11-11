import { configureStore, ThunkAction, Action, ConfigureStoreOptions } from '@reduxjs/toolkit';
import { useDispatch } from 'react-redux';
import { counterApi } from './services/counter';
import { postApi } from './services/posts';
import { timeApi } from './services/times';

export const createStore = (options?: ConfigureStoreOptions['preloadedState'] | undefined) =>
  configureStore({
    reducer: {
      [counterApi.reducerPath]: counterApi.reducer,
      [postApi.reducerPath]: postApi.reducer,
      [timeApi.reducerPath]: timeApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(counterApi.middleware, postApi.middleware, timeApi.middleware),
    ...options,
  });

export const store = createStore();

export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();
export type RootState = ReturnType<typeof store.getState>;
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, RootState, unknown, Action<string>>;
