import React from 'react';
import { Switch, Route, Link } from 'react-router-dom';
import { PostsManager } from './features/posts/PostsManager';
import { CounterList } from './features/counter/CounterList';
import { TimeList } from './features/time/TimeList';
import { PollingToggles } from './features/polling/PollingToggles';
import { Lazy } from './features/bundleSplitting';
import './App.css';

function App() {
  return (
    <div className="App">
      <div className="row">
        <div className="column column1">
          <span>
            <Link to="/">Times</Link> | <Link to="/posts">Posts</Link> | <Link to="/counters">Counter</Link> |{' '}
            <Link to="/bundleSplitting">Bundle Splitting</Link>
          </span>
        </div>
        <div className="column column1">
          <PollingToggles />
        </div>
      </div>
      <div></div>
      <div>
        <Switch>
          <Route exact path="/" component={TimeList} />
          <Route exact path="/counters" component={CounterList} />
          <Route path="/posts" component={PostsManager} />
          <Route path="/bundleSplitting" component={Lazy} />
        </Switch>
      </div>
    </div>
  );
}

export default App;
