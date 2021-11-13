import clsx from 'clsx'
import './App.css'
import { ChangeThemeForm } from './components/ChangeThemeForm/ChangeThemeForm'
import { CounterList } from './components/CounterList/CounterList'
import { CreateCounterForm } from './components/CreateCounterForm/CreateCounterForm'

const mainClassName = clsx('main')

function App() {
  return (
    <main className={mainClassName}>
      <header className="App-header">
        <h1>Counter example</h1>
      </header>
      <ChangeThemeForm />
      <CreateCounterForm />
      <CounterList />
    </main>
  )
}

export default App
