import type { JSX } from 'react'
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native'
import { Header } from './src/components/Header'
import { LearnReduxLinks } from './src/components/LearnReduxLinks'
import { Section } from './src/components/Section'
import { TypedColors } from './src/constants/TypedColors'
import { Counter } from './src/features/counter/Counter'
import { Quotes } from './src/features/quotes/Quotes'

export const App = (): JSX.Element => {
  const isDarkMode = useColorScheme() === 'dark'

  const backgroundStyle = {
    backgroundColor: isDarkMode ? TypedColors.darker : TypedColors.lighter,
  }

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}
      >
        <Header />
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
          <Section title="Learn More Redux">
            Discover what to do next with Redux:
          </Section>
          <LearnReduxLinks />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  highlight: {
    fontWeight: '700',
  },
})
