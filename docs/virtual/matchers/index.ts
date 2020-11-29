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

export const initialState = {
  isSpecial: false,
  isInteresting: false
} as ExampleState

export const isSpecialAndInterestingThunk = createAsyncThunk(
  'isSpecialAndInterestingThunk',
  () => {
    return {
      isSpecial: true,
      isInteresting: true
    }
  }
)

export const requestThunk1 = createAsyncThunk('requestThunk1', () => ({}))

export const requestThunk2 = createAsyncThunk('requestThunk2', () => ({}))

export const loadingReducer = createReducer(initialState, builder => {
  builder.addCase(isSpecialAndInterestingThunk.fulfilled, (state, action) => {
    if (isSpecial(action)) {
      state.isSpecial = true
    } else if (isInteresting(action)) {
      state.isInteresting = true
    }
  })
})
