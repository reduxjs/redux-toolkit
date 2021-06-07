import { Switch, Route } from 'react-router-dom'
import { PostsManager } from './features/posts/PostsManager'
import { Box } from '@chakra-ui/react'

function App() {
  return (
    <Box>
      <Switch>
        <Route path="/" component={PostsManager} />
      </Switch>
    </Box>
  )
}

export default App
