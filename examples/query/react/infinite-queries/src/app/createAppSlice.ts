import {
  asyncThunkCreator,
  buildCreateSlice,
  immerAdapter,
} from "@reduxjs/toolkit"

// `buildCreateSlice` allows us to create a slice with async thunks.
export const createAppSlice = buildCreateSlice({
  immutability: immerAdapter,
  creators: { asyncThunk: asyncThunkCreator },
})
