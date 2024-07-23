import ReactRouterDom = require('react-router-dom')
import bundleSplitting = require('./features/bundleSplitting/index.js')
import CounterListModule = require('./features/counter/CounterList.js')
import PollingTogglesModule = require('./features/polling/PollingToggles.js')
import PostsManagerModule = require('./features/posts/PostsManager.js')
import TimeListModule = require('./features/time/TimeList.js')

import Link = ReactRouterDom.Link
import Route = ReactRouterDom.Route
import Routes = ReactRouterDom.Routes

import Lazy = bundleSplitting.Lazy

const { CounterList } = CounterListModule
const { PollingToggles } = PollingTogglesModule
const { PostsManager } = PostsManagerModule
const { TimeList } = TimeListModule

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
      <div />
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

export = App
