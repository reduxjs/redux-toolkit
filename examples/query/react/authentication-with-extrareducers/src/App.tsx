import { Box, Center, VStack } from '@chakra-ui/react'
import { Route, Routes } from 'react-router-dom'
import { Login } from './features/auth/Login'
import { ProtectedComponent } from './features/auth/ProtectedComponent'
import { PrivateOutlet } from './utils/PrivateOutlet'

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

function App() {
  return (
    <Box>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateOutlet />}>
          <Route index element={<Hooray />} />
        </Route>
      </Routes>
    </Box>
  )
}

export default App
