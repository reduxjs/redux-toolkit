import ReactDOM from 'react-dom'
import './index.css'
import { store } from './store'
import { themeActions } from './services/theme/slice'
import { App } from './components/App/App'

if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
  store.dispatch(themeActions.changeColorScheme('dark'))
}

ReactDOM.render(<App />, document.getElementById('root'))
