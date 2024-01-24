import { Fragment } from "react"
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native"
import openURLInBrowser from "react-native/Libraries/Core/Devtools/openURLInBrowser"
import { TypedColors } from "../constants/TypedColors"

interface Link {
  title: string
  link: string
  description: string
}

const links: Link[] = [
  {
    title: "React",
    link: "https://reactjs.org",
    description: "JavaScript library for building user interfaces",
  },
  {
    title: "Redux",
    link: "https://redux.js.org",
    description: "A Predictable State Container for JS Apps",
  },
  {
    title: "Redux Toolkit",
    link: "https://redux-toolkit.js.org",
    description:
      "The official, opinionated, batteries-included toolset for efficient Redux development",
  },
  {
    title: "React Redux",
    link: "https://react-redux.js.org",
    description: "Official React bindings for Redux",
  },
  {
    title: "Reselect",
    link: "https://reselect.js.org",
    description: "A memoized selector library for Redux",
  },
]

export const LearnReduxLinks = () => {
  const isDarkMode = useColorScheme() === "dark"

  return (
    <View style={styles.container}>
      {links.map((item, index) => {
        return (
          <Fragment key={index}>
            <View
              style={[
                styles.separator,
                {
                  backgroundColor: isDarkMode
                    ? TypedColors.dark
                    : TypedColors.light,
                },
              ]}
            />
            <TouchableOpacity
              accessibilityRole={"button"}
              onPress={() => {
                openURLInBrowser(item.link)
              }}
              style={styles.linkContainer}
            >
              <Text style={styles.link}>{item.title}</Text>
              <Text
                style={[
                  styles.description,
                  { color: isDarkMode ? TypedColors.light : TypedColors.dark },
                ]}
              >
                {item.description}
              </Text>
            </TouchableOpacity>
          </Fragment>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  linkContainer: {
    flexWrap: "wrap",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  link: {
    flex: 2,
    fontSize: 18,
    fontWeight: "400",
    color: TypedColors.primary,
  },
  description: {
    flex: 3,
    paddingVertical: 16,
    fontWeight: "400",
    fontSize: 18,
  },
  separator: {
    height: 1,
  },
})
