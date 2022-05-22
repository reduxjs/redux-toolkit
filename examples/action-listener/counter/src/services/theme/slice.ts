import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export type ColorScheme = 'light' | 'dark'

export interface ThemeState {
  colorScheme: ColorScheme
}

export const themeSlice = createSlice({
  name: 'theme',
  initialState: {
    colorScheme: 'light',
  } as ThemeState,
  reducers: {
    changeColorScheme(state: {colorScheme: string; }, action: PayloadAction<ColorScheme>) {
      state.colorScheme = action.payload
    },
  },
})

export const themeActions = themeSlice.actions
