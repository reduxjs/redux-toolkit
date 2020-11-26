import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { postApi, User } from 'src/app/services/posts';
import { RootState } from 'src/app/store';

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
} as { user: null | User; token: string | null; isAuthenticated: boolean };

const slice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, { payload }: PayloadAction<{ token: string; user: User }>) => {
      state.user = payload.user;
      state.token = payload.token;
      state.isAuthenticated = true;
    },
    logout: () => initialState,
  },
  extraReducers: (builder) => {
    // This won't have any effect due to setCredentials being called first, but this is another way you can implement this same behavior
    // without using a custom action.
    builder.addMatcher(postApi.endpoints.login.matchFulfilled, (state, { payload }) => {
      state.user = payload.user;
      state.token = payload.token;
      state.isAuthenticated = true;
    });
  },
});

export const { setCredentials, logout } = slice.actions;
export default slice.reducer;

export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
