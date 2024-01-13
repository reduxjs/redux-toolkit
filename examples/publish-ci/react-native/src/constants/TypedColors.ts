import { Colors } from "react-native/Libraries/NewAppScreen"

interface AllColors {
  primary: string
  white: string
  lighter: string
  light: string
  dark: string
  darker: string
  black: string
}

export const TypedColors = Colors as AllColors
