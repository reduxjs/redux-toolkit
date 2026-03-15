import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import projectsReducer from '../features/projects/projectsSlice';
import tasksReducer from '../features/tasks/tasksSlice';
import filtersReducer from '../features/filters/filtersSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    projects: projectsReducer,
    tasks: tasksReducer,
    filters: filtersReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'auth/login/fulfilled',
          'auth/restoreSession/fulfilled',
        ],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
