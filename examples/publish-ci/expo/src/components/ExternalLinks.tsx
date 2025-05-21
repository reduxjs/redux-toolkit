import type { JSX } from 'react'
import { Fragment } from 'react'
import { StyleSheet, Text, useColorScheme, View } from 'react-native'
import { Colors } from '../constants/Colors'
import { ExternalLink } from './ExternalLink'

export type Link = {
  id: number
  title: string
  url: string
  description: string
}

type ExternalLinksProps = {
  links: Link[]
}

export const ExternalLinks = ({ links }: ExternalLinksProps): JSX.Element => {
  const isDarkMode = useColorScheme() === 'dark'

  return (
    <View style={styles.container}>
      {links.map(({ description, id, title, url }) => (
        <Fragment key={id}>
          <View
            style={[
              styles.separator,
              { backgroundColor: isDarkMode ? Colors.dark : Colors.light },
            ]}
          />
          <ExternalLink style={styles.linkContainer} url={url}>
            <Text style={styles.link}>{title}</Text>
            <Text
              style={[
                styles.description,
                { color: isDarkMode ? Colors.lighter : Colors.dark },
              ]}
            >
              {description}
            </Text>
          </ExternalLink>
        </Fragment>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  linkContainer: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  link: {
    flex: 2,
    fontSize: 18,
    fontWeight: '400',
    color: Colors.primary,
  },
  description: {
    flex: 3,
    paddingVertical: 16,
    fontWeight: '400',
    fontSize: 18,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
})
