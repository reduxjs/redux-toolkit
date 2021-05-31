import { Route, Switch } from 'react-router'
import { PostsManager } from './features/posts/PostsManager'

function App() {
  return (
    <Switch>
      <Route path="/" component={PostsManager} />
    </Switch>
  )
}

export default App
