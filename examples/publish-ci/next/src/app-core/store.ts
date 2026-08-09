import { configureStore } from '@reduxjs/toolkit'
import counterReducer from '../features/counter/counterSlice'
import { postApi } from './services/post'
import { timeApi } from './services/times'

export const makeStore = () =>
  configureStore({
    reducer: {
      counter: counterReducer,
      [postApi.reducerPath]: postApi.reducer,
      [timeApi.reducerPath]: timeApi.reducer,
    },
    middleware: (gDM) => gDM().concat(postApi.middleware, timeApi.middleware),
  })

export type AppStore = ReturnType<typeof makeStore>
export type AppDispatch = AppStore['dispatch']
export type RootState = ReturnType<AppStore['getState']>
