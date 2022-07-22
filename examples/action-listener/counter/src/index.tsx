import ReactDOM from 'react-dom/client'
import './index.css'
import { store } from './store'
import { themeActions } from './services/theme/slice'
import { App } from './components/App/App'

if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
  store.dispatch(themeActions.changeColorScheme('dark'))
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)

root.render(<App />)
