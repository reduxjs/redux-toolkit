import { Box } from '@chakra-ui/react'
import { Route, Routes } from 'react-router-dom'
import { PostsManager } from './features/posts/PostsManager'

function App() {
  return (
    <Box>
      <Routes>
        <Route path="*" element={<PostsManager />} />
      </Routes>
    </Box>
  )
}

export default App
