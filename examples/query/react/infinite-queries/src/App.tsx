import "./App.css"
import { BrowserRouter, Routes, Route, Link } from "react-router"

import { PaginationExample } from "./features/pagination/PaginationExample"

const Menu = () => {
  return (
    <div>
      <h2>Examples</h2>
      <ul>
        <li>
          <Link to="/pagination">Pagination</Link>
        </li>
      </ul>
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
          <Route path="/pagination" element={<PaginationExample />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
