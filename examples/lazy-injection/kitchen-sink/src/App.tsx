import { Suspense, useState, useTransition } from "react"
import logo from "./logo.svg"
import { Todos } from "./features/todos/Todos"
import { lazily } from "react-lazily"
import { Tab } from "./components/Tab"
import "./App.css"

// equivalent to
// const Counter = lazy(() => import("./features/counter/Counter").then(m => ({ default: m.Counter }))
const { Counter } = lazily(() => import("./features/counter/Counter"))

const { Quotes } = lazily(() => import("./features/quotes/Quotes"))

const App = () => {
  const [tab, setTab] = useState("todos")
  const [, startTransition] = useTransition()
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <span>
          <span>Learn </span>
          <a
            className="App-link"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            React
          </a>
          <span>, </span>
          <a
            className="App-link"
            href="https://redux.js.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Redux
          </a>
          <span>, </span>
          <a
            className="App-link"
            href="https://redux-toolkit.js.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Redux Toolkit
          </a>
          <span>, </span>
          <a
            className="App-link"
            href="https://react-redux.js.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            React Redux
          </a>
          ,<span> and </span>
          <a
            className="App-link"
            href="https://reselect.js.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Reselect
          </a>
        </span>
      </header>
      <div className="tabs">
        <Tab
          selected={tab === "todos"}
          onClick={() => startTransition(() => setTab("todos"))}
        >
          Todos
        </Tab>
        <Tab
          selected={tab === "counter"}
          onClick={() => startTransition(() => setTab("counter"))}
        >
          Counter
        </Tab>
        <Tab
          selected={tab === "quotes"}
          onClick={() => startTransition(() => setTab("quotes"))}
        >
          Quotes
        </Tab>
      </div>
      {tab === "todos" && <Todos />}
      {tab === "counter" && (
        <Suspense fallback="Loading counter">
          <Counter />
        </Suspense>
      )}
      {tab === "quotes" && (
        <Suspense fallback="Loading quotes">
          <Quotes />
        </Suspense>
      )}
    </div>
  )
}

export default App
