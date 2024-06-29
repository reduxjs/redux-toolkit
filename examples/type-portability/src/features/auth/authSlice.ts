import { createSlice } from '@reduxjs/toolkit'
import type { User } from '../../app/services/posts'
import { postsApi } from '../../app/services/posts'

export const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
} as { user: null | User; token: string | null; isAuthenticated: boolean }

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(postsApi.endpoints.login.matchPending, (state, action) => {
        console.log('pending', action)
      })
      .addMatcher(postsApi.endpoints.login.matchFulfilled, (state, action) => {
        console.log('fulfilled', action)
        state.user = action.payload.user
        state.token = action.payload.token
        state.isAuthenticated = true
      })
      .addMatcher(postsApi.endpoints.login.matchRejected, (state, action) => {
        console.log('rejected', action)
      })
  },
  selectors: {
    selectIsAuthenticated: (authState) => authState.isAuthenticated,
  },
})

export const {
  actions,
  caseReducers,
  getInitialState,
  getSelectors,
  injectInto,
  name,
  reducer,
  reducerPath,
  selectSlice,
  selectors,
} = authSlice

export const { selectIsAuthenticated } = getSelectors(selectSlice)

export const { unwrapped } = selectIsAuthenticated

export const { logout: _logout } = caseReducers

export const { logout } = authSlice.actions
