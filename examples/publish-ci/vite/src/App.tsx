import { Counter } from './features/counter/Counter'
import { TimeDisplay } from './features/time/TimeList'
import { Post } from './features/posts/Post'
import './App.css'

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <Counter />
        <TimeDisplay
          label="(GMT -5:00) Eastern Time (US & Canada), Bogota, Lima"
          offset="-5:00"
        />
        <Post id={1} />
      </header>
    </div>
  )
}

export default App
