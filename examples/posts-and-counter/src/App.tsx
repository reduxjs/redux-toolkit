import React from 'react';
import { Switch, Route, Link } from 'react-router-dom';
import { PostsManager } from './features/posts/PostsManager';
import { CounterList } from './features/counter/CounterList';
import { TimeList } from './features/time/TimeList';

function App() {
  return (
    <div className="App">
      <div>
        <Link to="/">Times</Link> | <Link to="/posts">Posts</Link> | <Link to="/counters">Counter</Link>
      </div>
      <div>
        <Switch>
          <Route exact path="/" component={TimeList} />
          <Route exact path="/counters" component={CounterList} />
          <Route exact path="/posts" component={PostsManager} />
        </Switch>
      </div>
    </div>
  );
}

export default App;
