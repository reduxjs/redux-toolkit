import type { JSX } from 'react'
import { Provider } from 'react-redux'
import { store } from './src/app/store'
import { Main } from './src/Main'

export const App = (): JSX.Element => (
  <Provider store={store}>
    <Main />
  </Provider>
)
