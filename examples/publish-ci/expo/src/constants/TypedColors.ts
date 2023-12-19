import { Colors } from 'react-native/Libraries/NewAppScreen';

export interface TypedColors {
  primary: string;
  white: string;
  lighter: string;
  light: string;
  dark: string;
  darker: string;
  black: string;
}

export const TypedColors = Colors as TypedColors;
