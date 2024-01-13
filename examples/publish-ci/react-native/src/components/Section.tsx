import type { PropsWithChildren } from "react"
import { StyleSheet, Text, View, useColorScheme } from "react-native"
import { TypedColors } from "../constants/TypedColors"

type SectionProps = PropsWithChildren<{
  title: string
}>

export const Section = ({ children, title }: SectionProps) => {
  const isDarkMode = useColorScheme() === "dark"

  return (
    <View style={styles.sectionContainer}>
      <Text
        style={[
          styles.sectionTitle,
          { color: isDarkMode ? TypedColors.white : TypedColors.black },
        ]}
      >
        {title}
      </Text>
      <Text
        style={[
          styles.sectionDescription,
          { color: isDarkMode ? TypedColors.light : TypedColors.dark },
        ]}
      >
        {children}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "600",
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "400",
  },
})
