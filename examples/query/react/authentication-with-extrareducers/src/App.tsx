import { Switch, Route } from 'react-router-dom'
import { Box, Center, VStack } from '@chakra-ui/react'

import { Login } from './features/auth/Login'
import { PrivateRoute } from './utils/PrivateRoute'
import { ProtectedComponent } from './features/auth/ProtectedComponent'

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
      <Switch>
        <Route exact path="/login" component={Login} />
        <PrivateRoute path="/">
          <Hooray />
        </PrivateRoute>
      </Switch>
    </Box>
  )
}

export default App
