import {
  createAsyncThunk,
  createReducer,
  PayloadAction
} from '@reduxjs/toolkit'

export interface Data {
  isInteresting: boolean
  isSpecial: boolean
}

export interface Special extends Data {
  isSpecial: true
}

export interface Interesting extends Data {
  isInteresting: true
}

export function isSpecial(
  action: PayloadAction<Data>
): action is PayloadAction<Special> {
  return action.payload.isSpecial
}

export function isInteresting(
  action: PayloadAction<Data>
): action is PayloadAction<Interesting> {
  return action.payload.isInteresting
}

export interface ExampleState {
  isSpecial: boolean
  isInteresting: boolean
}

export const initialState: ExampleState = {
  isSpecial: false,
  isInteresting: false
}

export const request = createAsyncThunk('request', () => {
  return {
    isSpecial: true,
    isInteresting: true
  }
})

export const loadingReducer = createReducer(initialState, builder => {
  builder.addCase(request.fulfilled, (state, action) => {
    if (isSpecial(action)) {
      state.isSpecial = true
    } else if (isInteresting(action)) {
      state.isInteresting = true
    }
  })
})
