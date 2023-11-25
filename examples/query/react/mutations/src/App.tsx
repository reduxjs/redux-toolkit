import { Outlet, createBrowserRouter, RouterProvider } from 'react-router-dom'
import { PostsManager } from './features/posts/PostsManager'
import { Box } from '@chakra-ui/react'

function AppLayout() {
  return (
    <Box>
      <Outlet />
    </Box>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [{ path: '*', element: <PostsManager /> }],
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
