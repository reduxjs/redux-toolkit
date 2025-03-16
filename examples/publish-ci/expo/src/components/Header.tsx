import type { JSX } from 'react'
import { Animated, StyleSheet, View, useColorScheme } from 'react-native'
import { useBounceAnimation, useViewportUnits } from '../app/hooks'
import { Colors } from '../constants/Colors'
import logo from './logo.gif'

export const Header = (): JSX.Element => {
  const isDarkMode = useColorScheme() === 'dark'
  const { vh } = useViewportUnits()
  const bounce = useBounceAnimation()
  const height = 40 * vh

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDarkMode ? Colors.black : Colors.white },
      ]}
    >
      <Animated.Image
        accessibilityRole="image"
        source={logo}
        style={{ height, transform: [{ translateY: bounce }] }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
})
