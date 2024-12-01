import "./App.css"
import { BrowserRouter, Routes, Route, Link } from "react-router"

import { PaginationExample } from "./features/pagination/PaginationExample"
import {
  InfiniteScrollExample,
  InfiniteScrollAbout,
} from "./features/infinite-scroll/InfiniteScrollExample"

const Menu = () => {
  return (
    <div>
      <h2>Examples</h2>
      <ul>
        <li>
          <Link to="/pagination">Pagination</Link>
        </li>
        <li>
          <Link to="/infinite-scroll">Infinite Scroll</Link>
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
          <Route path="/infinite-scroll" element={<InfiniteScrollExample />} />
          <Route
            path="/infinite-scroll/about"
            element={<InfiniteScrollAbout />}
          />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
