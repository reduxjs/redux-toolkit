import { BrowserRouter, Link, Route, Routes, useLocation } from "react-router"
import "./App.css"

import { Outlet } from "react-router"
import BidirectionalCursorInfScroll from "./features/bidirectional-cursor-infinite-scroll/BidirectionalCursorInfScroll"
import {
  InfiniteScrollAbout,
  InfiniteScrollExample,
} from "./features/infinite-scroll/InfiniteScrollExample"
import LimitOffsetExample from "./features/limit-offset/LimitOffsetExample"
import { InfiniteScrollMaxPagesExample } from "./features/max-pages/InfiniteScrollMaxExample"
import PaginationInfScrollExample from "./features/pagination-infinite-scroll/PaginationInfScrollExample"
import { PaginationExample } from "./features/pagination/PaginationExample"

const Menu = () => {
  return (
    <div>
      <h2>Examples</h2>
      <ul>
        <li>
          <Link to="/examples/pagination">Pagination</Link>
        </li>
        <li>
          <Link to="/examples/infinite-scroll">Infinite Scroll</Link>
        </li>
        <li>
          <Link to="/examples/infinite-scroll-max">
            Infinite Scroll + max pages
          </Link>
        </li>
        <li>
          <Link to="/examples/bidirectional-cursor-infinte-scroll">
            Bidirectional Cursor-Based Infinite Scroll
          </Link>
        </li>
        <li>
          <Link to="/examples/limit-offset">
            Limit and Offset Infinite Scroll
          </Link>
        </li>
        <li>
          <Link to="/examples/pagination-infinite-scroll">
            Pagination Infinite Scroll
          </Link>
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
          <Route
            path="/examples"
            element={
              <div>
                <Link to="/">Back to Menu</Link>
                <Outlet />
              </div>
            }
          >
            <Route path="pagination" element={<PaginationExample />} />
            <Route path="infinite-scroll" element={<InfiniteScrollExample />} />
            <Route
              path="infinite-scroll/about"
              element={<InfiniteScrollAbout />}
            />
            <Route
              path="infinite-scroll-max"
              element={<InfiniteScrollMaxPagesExample />}
            />
            <Route
              path="bidirectional-cursor-infinte-scroll"
              element={<BidirectionalCursorInfScroll />}
            />
            <Route path="limit-offset" element={<LimitOffsetExample />} />
            <Route
              path="pagination-infinite-scroll"
              element={<PaginationInfScrollExample />}
            />
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
