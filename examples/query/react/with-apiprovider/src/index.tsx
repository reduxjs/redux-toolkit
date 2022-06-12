import ReactDOM from 'react-dom/client'
import App from './App'

const rootElement = document.getElementById('root')

const reactRoot = ReactDOM.createRoot(rootElement as HTMLElement)

reactRoot.render(<App />)
