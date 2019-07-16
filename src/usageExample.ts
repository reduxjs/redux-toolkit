import { configureStore } from "./configureStore";
import { Action, AnyAction } from "redux";

// this file will be removed later in the PR, this is just a usage example

function expectType<T>(t: T) { return t; }

interface MyEnhancedDispatch {
  (action: Action<'test'>): 'test successful';
  (action: Action<'anotherTest'>): Promise<'and another test successful'>;
  <T extends AnyAction>(action: T): T;
}

const store = configureStore<MyEnhancedDispatch>({
  reducer: () => ({})
})

expectType<Action<'asd'>>(store.dispatch({ type: "asd" }));
expectType<'test successful'>(store.dispatch({ type: "test" }));
expectType<Promise<'and another test successful'>>(store.dispatch({ type: 'anotherTest' }))


// without type argument still works like before
const defaultStore = configureStore({
  reducer: () => ({})
})
expectType<Action<'asd'>>(defaultStore.dispatch({ type: "asd" }));
expectType<Promise<"succeeded">>(defaultStore.dispatch(async () => {
  // other stuff
  return "succeeded" as const;
}
))