import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../../app/services/posts';
import { RootState } from '../../app/store';

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
});

export const { setCredentials, logout } = slice.actions;
export default slice.reducer;

export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
