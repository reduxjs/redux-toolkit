import { Animated, StyleSheet, View, useColorScheme } from "react-native"
import { useBounceAnimation, useViewportUnits } from "../app/hooks"
import { TypedColors } from "../constants/TypedColors"
import logo from "./logo.gif"

export const Header = () => {
  const isDarkMode = useColorScheme() === "dark"
  const { vh } = useViewportUnits()
  const bounce = useBounceAnimation()
  const height = 40 * vh

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDarkMode ? TypedColors.black : TypedColors.white },
      ]}
    >
      <Animated.Image
        accessibilityRole={"image"}
        source={logo}
        style={{ height, transform: [{ translateY: bounce }] }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
  },
})
