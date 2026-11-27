import { asyncThunkCreator, buildCreateSlice } from '@reduxjs/toolkit'

// `buildCreateSlice` allows us to create a slice with async thunks.
// If you are not using async thunks you can use the standalone `createSlice`.
export const createAppSlice = buildCreateSlice({
  creators: { asyncThunk: asyncThunkCreator },
})
