import "./App.css"
import { BrowserRouter, Routes, Route, Link } from "react-router"

import { PaginationExample } from "./features/pagination/PaginationExample"
import {
  InfiniteScrollExample,
  InfiniteScrollAbout,
} from "./features/infinite-scroll/InfiniteScrollExample"
import { InfiniteScrollMaxPagesExample } from "./features/max-pages/InfiniteScrollMaxExample"

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
        <li>
          <Link to="/infinite-scroll-max">Infinite Scroll + max pages</Link>
        </li>
      </ul>
    </div>
  )
}

const App = () => {
  return (
    <BrowserRouter>
      <div className="App">
        <h1>RTKQ Infinite Query Example Showcase</h1>
        <Routes>
          <Route path="/" element={<Menu />} />
          <Route path="/pagination" element={<PaginationExample />} />
          <Route path="/infinite-scroll" element={<InfiniteScrollExample />} />
          <Route
            path="/infinite-scroll/about"
            element={<InfiniteScrollAbout />}
          />
          <Route
            path="/infinite-scroll-max"
            element={<InfiniteScrollMaxPagesExample />}
          />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
