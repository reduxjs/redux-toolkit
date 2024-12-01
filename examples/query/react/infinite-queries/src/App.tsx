import "./App.css"
import { BrowserRouter, Routes, Route, Link } from "react-router"

const Menu = () => {
  return (
    <div>
      <h2>Examples</h2>
      <ul>
        <li>
          <Link to="/example-1">Example 1</Link>
        </li>
      </ul>
    </div>
  )
}

const Example1 = () => {
  return (
    <div>
      <h2>Example 1</h2>
    </div>
  )
}

const App = () => {
  return (
    <BrowserRouter>
      <div className="App">
        <h1>Infinite Query Examples</h1>
        <Routes>
          <Route path="/" element={<Menu />} />
          <Route path="/example-1" element={<Example1 />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
