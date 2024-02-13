import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native"
import { Counter } from "./src/features/counter/Counter"

import {
  DebugInstructions,
  HermesBadge,
  LearnMoreLinks,
  ReloadInstructions,
} from "react-native/Libraries/NewAppScreen"
import { Header } from "./src/components/Header"
import { LearnReduxLinks } from "./src/components/LearnReduxLinks"
import { Section } from "./src/components/Section"
import { TypedColors } from "./src/constants/TypedColors"
import { Quotes } from "./src/features/quotes/Quotes"

export const App = () => {
  const isDarkMode = useColorScheme() === "dark"

  const backgroundStyle = {
    backgroundColor: isDarkMode ? TypedColors.darker : TypedColors.lighter,
  }

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}
      >
        <Header />
        <HermesBadge />
        <View
          style={{
            backgroundColor: isDarkMode ? TypedColors.black : TypedColors.white,
          }}
        >
          <Counter />
          <Quotes />
          <Section title="Step One">
            Edit <Text style={styles.highlight}>App.tsx</Text> to change this
            screen and then come back to see your edits.
          </Section>
          <Section title="See Your Changes">
            <ReloadInstructions />
          </Section>
          <Section title="Debug">
            <DebugInstructions />
          </Section>
          <Section title="Learn More Redux">
            Discover what to do next with Redux:
          </Section>
          <LearnReduxLinks />
          <Section title="Learn More React Native">
            Read the docs to discover what to do next:
          </Section>
          <LearnMoreLinks />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  highlight: {
    fontWeight: "700",
  },
})
