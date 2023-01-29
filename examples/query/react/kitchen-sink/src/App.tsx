import React from 'react'
import {
  Link,
  createBrowserRouter,
  Outlet,
  RouterProvider,
} from 'react-router-dom'
import { PostsManager } from './features/posts/PostsManager'
import { CounterList } from './features/counter/CounterList'
import { TimeList } from './features/time/TimeList'
import { PollingToggles } from './features/polling/PollingToggles'
import { Lazy } from './features/bundleSplitting'
import './App.css'

function AppLayout() {
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
        <Outlet />
      </div>
    </div>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { path: '/', element: <TimeList /> },
      { path: '/counters', element: <CounterList /> },
      {
        path: '/posts/*',
        element: <PostsManager />,
      },
      { path: '/bundleSplitting', element: <Lazy /> },
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
