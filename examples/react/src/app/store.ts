import { configureStore, ConfigureStoreOptions } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { counterApi } from './services/counter';
import { postApi } from './services/posts';
import { timeApi } from './services/times';
import polling from '../features/polling/pollingSlice';
import { splitApi } from './services/split';
import auth from '../features/auth/authSlice';

export const createStore = (options?: ConfigureStoreOptions['preloadedState'] | undefined) =>
  configureStore({
    reducer: {
      [counterApi.reducerPath]: counterApi.reducer,
      [postApi.reducerPath]: postApi.reducer,
      [timeApi.reducerPath]: timeApi.reducer,
      [splitApi.reducerPath]: splitApi.reducer,
      polling,
      auth,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(counterApi.middleware, postApi.middleware, timeApi.middleware, splitApi.middleware),
    ...options,
  });

export const store = createStore();

export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();
export type RootState = ReturnType<typeof store.getState>;
export const useTypedSelector: TypedUseSelectorHook<RootState> = useSelector;
