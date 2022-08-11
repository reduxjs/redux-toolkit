import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import { PostsManager } from './features/posts/PostsManager'
import { CounterList } from './features/counter/CounterList'
import { TimeList } from './features/time/TimeList'
import { PollingToggles } from './features/polling/PollingToggles'
import { Lazy } from './features/bundleSplitting'
import './App.css'

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
