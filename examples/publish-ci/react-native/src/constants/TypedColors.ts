import { Colors } from 'react-native/Libraries/NewAppScreen'

type AllColors = {
  primary: string
  white: string
  lighter: string
  light: string
  dark: string
  darker: string
  black: string
}

export const TypedColors: AllColors = Colors satisfies AllColors as AllColors
