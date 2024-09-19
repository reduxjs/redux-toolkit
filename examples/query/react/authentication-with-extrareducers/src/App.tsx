import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom'
import { Box, Center, VStack } from '@chakra-ui/react'

import { Login } from './features/auth/Login'
import { PrivateOutlet } from './utils/PrivateOutlet'
import { ProtectedComponent } from './features/auth/ProtectedComponent'

function AppLayout() {
  return (
    <Box>
      <Outlet />
    </Box>
  )
}

function Hooray() {
  return (
    <Center h="500px">
      <VStack>
        <Box>Hooray you logged in!</Box>
        <Box>
          <ProtectedComponent />
        </Box>
      </VStack>
    </Center>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { path: 'login', element: <Login /> },
      {
        path: '*',
        element: <PrivateOutlet />,
        children: [
          {
            index: true,
            element: <Hooray />,
          },
        ],
      },
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
