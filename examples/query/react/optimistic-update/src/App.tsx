import { Route, Routes } from 'react-router-dom'
import { PostsManager } from './features/posts/PostsManager'

function App() {
  return (
    <Routes>
      <Route path="*" element={<PostsManager />} />
    </Routes>
  )
}

export default App
