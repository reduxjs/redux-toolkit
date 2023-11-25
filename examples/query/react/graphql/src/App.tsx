import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { PostsManager } from './features/posts/PostsManager'

const router = createBrowserRouter([
  {
    path: '/',
    element: <PostsManager />,
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
