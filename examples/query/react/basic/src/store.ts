import {
  combineReducers,
  configureStore,
  getDefaultMiddleware,
} from '@reduxjs/toolkit'
import { pokemonApi } from './services/pokemon'

const rootReducer = combineReducers({
  [pokemonApi.reducerPath]: pokemonApi.reducer,
})

// We could do DeepPartial<RootState>? I don't know if preloadedState merges state or not
export const setupStore = (initialState?: RootState) => {
  // Adding pokemonApi's middleware to default middleware for RTK-Query features
  const middleWare = getDefaultMiddleware<RootState>().concat(
    pokemonApi.middleware
  )

  return configureStore({
    reducer: rootReducer,
    middleware: middleWare,
    preloadedState: initialState,
  })
}

export type RootState = ReturnType<typeof rootReducer>
export type AppStore = ReturnType<typeof setupStore>
export type AppDispatch = ReturnType<typeof setupStore>['dispatch']
