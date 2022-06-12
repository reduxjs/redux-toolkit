import ReactDOM from 'react-dom/client'
import { ApiProvider } from '@reduxjs/toolkit/query/react'
import App from './App'
import { pokemonApi } from './services/pokemon'

const rootElement = document.getElementById('root')

const reactRoot = ReactDOM.createRoot(rootElement as HTMLElement)

reactRoot.render(
  <ApiProvider api={pokemonApi}>
    <App />
  </ApiProvider>
)
