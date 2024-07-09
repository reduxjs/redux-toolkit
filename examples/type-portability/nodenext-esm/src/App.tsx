import { Link, Route, Routes } from 'react-router-dom'
import { Lazy } from './features/bundleSplitting/index.js'
import { CounterList } from './features/counter/CounterList.js'
import { PollingToggles } from './features/polling/PollingToggles.js'
import { PostsManager } from './features/posts/PostsManager.js'
import { TimeList } from './features/time/TimeList.js'

function App() {
  return (
    <div className="App">
      <div className="row">
        <div className="column column1">
          <span>
            <Link to="/">Times</Link> | <Link to="/posts">Posts</Link> |{' '}
            <Link to="/counters">Counter</Link> |{' '}
            <Link to="/bundleSplitting">Bundle Splitting</Link>
          </span>
        </div>
        <div className="column column1">
          <PollingToggles />
        </div>
      </div>
      <div></div>
      <div>
        <Routes>
          <Route path="/" element={<TimeList />} />
          <Route path="/counters" element={<CounterList />} />
          <Route path="/posts/*" element={<PostsManager />} />
          <Route path="/bundleSplitting" element={<Lazy />} />
        </Routes>
      </div>
    </div>
  )
}

export default App
