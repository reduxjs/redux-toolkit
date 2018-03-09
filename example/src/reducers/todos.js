import {createReducer} from "@acemarke/redux-starter-kit";

function addTodo(state, {id, text}) {
  // Can safely call state.push() here
  state.push({id, text, completed : false});
}

function toggleTodo(state, {id}) {
  const todo = state.find(todo => todo.id === id);
  // Can directly modify the todo object
  todo.completed = !todo.completed;
}

export default createReducer([], {
  ADD_TODO : addTodo,
  TOGGLE_TODO : toggleTodo
});
