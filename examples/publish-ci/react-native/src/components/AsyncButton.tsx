import type { PropsWithChildren } from "react"
import { useRef } from "react"
import type {
  GestureResponderEvent,
  PressableProps,
  ViewStyle,
} from "react-native"
import { Animated, Pressable, StyleSheet, View } from "react-native"

type AsyncButtonProps = PressableProps & PropsWithChildren

export const AsyncButton = ({
  onPress,
  style,
  children,
  ...restProps
}: AsyncButtonProps) => {
  const progress = useRef(new Animated.Value(0)).current
  const opacity = useRef(new Animated.Value(1)).current

  const _onPress = (e: GestureResponderEvent) => {
    progress.setValue(0)
    opacity.setValue(1)

    onPress?.(e)

    Animated.timing(progress, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished) {
        return
      }

      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start()
    })
  }

  const progressInterpolate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
    extrapolate: "clamp",
  })

  const progressStyle: Animated.WithAnimatedObject<ViewStyle> = {
    width: progressInterpolate,
    opacity,
  }

  return (
    <Pressable style={style} onPress={_onPress} {...restProps}>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[styles.progress, progressStyle]} />
      </View>
      {children}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  progress: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(112,76,182, 0.15)",
  },
})
