import { Routes, Route } from 'react-router-dom'
import { PostsManager } from './features/posts/PostsManager'
import { Box } from '@chakra-ui/react'

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
