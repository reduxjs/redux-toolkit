import type { JSX } from 'react'
import type { Link } from './ExternalLinks'
import { ExternalLinks } from './ExternalLinks'

const reduxLinks: Link[] = [
  {
    id: 1,
    title: 'React',
    url: 'https://reactjs.org',
    description: 'JavaScript library for building user interfaces',
  },
  {
    id: 2,
    title: 'Redux',
    url: 'https://redux.js.org',
    description: 'A Predictable State Container for JS Apps',
  },
  {
    id: 3,
    title: 'Redux Toolkit',
    url: 'https://redux-toolkit.js.org',
    description:
      'The official, opinionated, batteries-included toolset for efficient Redux development',
  },
  {
    id: 4,
    title: 'React Redux',
    url: 'https://react-redux.js.org',
    description: 'Official React bindings for Redux',
  },
  {
    id: 5,
    title: 'Reselect',
    url: 'https://reselect.js.org',
    description: 'A memoized selector library for Redux',
  },
]

const reactNativeLinks: Link[] = [
  {
    id: 1,
    title: 'The Basics',
    url: 'https://reactnative.dev/docs/tutorial',
    description: 'Explains a Hello World for React Native.',
  },
  {
    id: 2,
    title: 'Style',
    url: 'https://reactnative.dev/docs/style',
    description:
      'Covers how to use the prop named style which controls the visuals.',
  },
  {
    id: 3,
    title: 'Layout',
    url: 'https://reactnative.dev/docs/flexbox',
    description: 'React Native uses flexbox for layout, learn how it works.',
  },
  {
    id: 4,
    title: 'Components',
    url: 'https://reactnative.dev/docs/components-and-apis',
    description: 'The full list of components and APIs inside React Native.',
  },
  {
    id: 5,
    title: 'Navigation',
    url: 'https://reactnative.dev/docs/navigation',
    description:
      'How to handle moving between screens inside your application.',
  },
  {
    id: 6,
    title: 'Networking',
    url: 'https://reactnative.dev/docs/network',
    description: 'How to use the Fetch API in React Native.',
  },
  {
    id: 7,
    title: 'Debugging',
    url: 'https://facebook.github.io/react-native/docs/debugging',
    description:
      'Learn about the tools available to debug and inspect your app.',
  },
  {
    id: 8,
    title: 'Help',
    url: 'https://facebook.github.io/react-native/help',
    description:
      'Need more help? There are many other React Native developers who may have the answer.',
  },
  {
    id: 9,
    title: 'Follow us',
    url: 'https://x.com/reactnative',
    description:
      'Stay in touch with the community, join in on Q&As and more by following React Native on X.',
  },
]

export const LearnMoreLinks = (): JSX.Element => (
  <ExternalLinks links={reactNativeLinks} />
)

export const LearnReduxLinks = (): JSX.Element => (
  <ExternalLinks links={reduxLinks} />
)
