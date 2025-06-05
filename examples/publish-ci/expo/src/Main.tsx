import { StatusBar } from 'expo-status-bar'
import type { JSX } from 'react'
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native'
import { Header } from './components/Header'
import { LearnMoreLinks, LearnReduxLinks } from './components/LearnReduxLinks'
import { Section } from './components/Section'
import { Colors } from './constants/Colors'
import { Counter } from './features/counter/Counter'
import { Quotes } from './features/quotes/Quotes'

const ReloadInstructions = Platform.select({
  ios: () => (
    <Text>
      Press <Text style={styles.highlight}>Cmd + R</Text> in the simulator to
      reload your app's code.
    </Text>
  ),
  default: () => (
    <Text>
      Double tap <Text style={styles.highlight}>R</Text> on your keyboard to
      reload your app's code.
    </Text>
  ),
})

const DebugInstructions = Platform.select({
  ios: () => (
    <Text>
      Press <Text style={styles.highlight}>Cmd + D</Text> in the simulator or{' '}
      <Text style={styles.highlight}>Shake</Text> your device to open the Dev
      Menu.
    </Text>
  ),
  default: () => (
    <Text>
      Press <Text style={styles.highlight}>Cmd or Ctrl + M</Text> or{' '}
      <Text style={styles.highlight}>Shake</Text> your device to open the Dev
      Menu.
    </Text>
  ),
})

export const Main = (): JSX.Element => {
  const isDarkMode = useColorScheme() === 'dark'

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  }

  return (
    <SafeAreaView style={[backgroundStyle, styles.safeAreaView]}>
      <StatusBar
        style={isDarkMode ? 'light' : 'dark'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}
      >
        <Header />
        <View
          style={{
            backgroundColor: isDarkMode ? Colors.black : Colors.white,
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
    fontWeight: '700',
  },
  safeAreaView: {
    flex: 1,
  },
})
