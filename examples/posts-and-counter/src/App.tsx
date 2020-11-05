import React from "react";
import { Counter } from "./features/counter/Counter";
import { Switch, Route, Link } from "react-router-dom";
import { PostsManager } from "./features/posts/PostsManager";

function App() {
  return (
    <div className="App">
      <div>
        <Link to="/posts">Posts</Link> | <Link to="/">Counter</Link>
      </div>
      <div>
        <Switch>
          <Route exact path="/" component={Counter} />
          <Route path="/posts" component={PostsManager} />
        </Switch>
      </div>
    </div>
  );
}

export default App;
