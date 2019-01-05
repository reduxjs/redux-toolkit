import {
  Action,
  ActionCreator,
  Reducer,
  AnyAction,
  Middleware,
  StoreEnhancer,
  ReducersMapObject,
  Store
} from 'redux'

export {
  Action,
  ActionCreator,
  AnyAction,
  Middleware,
  Reducer,
  ReducersMapObject,
  Store,
  StoreEnhancer
} from 'redux'

/* configureStore() */

/**
 * A configuration object that can be passed to `configureStore()`.
 */
export interface StoreConfiguration<S, A extends Action = AnyAction> {
  /**
   * A single reducer function that will be used as the root reducer, or an
   * object of slice reducers that will be passed to `combineReducers()`.
   */
  reducer: Reducer<S, A> | ReducersMapObject<S, A>

  /**
   * An array of Redux middlewares. If not supplied, defaults to just
   * `redux-thunk`.
   */
  middleware?: Middleware[]

  /**
   * Whether to enable Redux DevTools integration. Defaults to `true`.
   */
  devTools?: boolean

  /**
   * The initial state. You may optionally specify it to hydrate the state
   * from the server in universal apps, or to restore a previously serialized
   * user session. If you use `combineReducers()` to produce the root reducer
   * function (either directly or indirectly by passing an object as `reducer`),
   * this must be an object with the same shape as the reducer map keys.
   */
  preloadedState?: S

  /**
   * The store enhancer. See `createStore()`. If you only need to add
   * middleware, you can use the `middleware` parameter instaead.
   */
  enhancer?: StoreEnhancer
}

/**
 * A friendlier abstraction over the standard Redux `createStore()` function.
 *
 * @param config The store configuration.
 * @returns A configured Redux store.
 */
export function configureStore<S, A extends Action = AnyAction>(
  config: StoreConfiguration<S, A>
): Store<S, A>

/* getDefaultMiddleware() */

/**
 * Returns any array containing the default middleware installed by
 * `configureStore`. Useful if you want to configure your store with a custom
 * `middleware` array but still keep the default set.
 */
export function getDefaultMiddleware(): Middleware[]

/* createAction() */

/**
 * An action with an associated payload. The type of action returned by
 * action creators that are generated using {@link createAction}.
 *
 * @template P The type of the action's payload.
 * @template T the type of the action's `type` tag.
 */
export interface PayloadAction<P = any, T = any> extends Action<T> {
  payload: P
}

/**
 * A utility function to create an action creator for the given action type
 * string. The action creator accepts a single argument, which will be included
 * in the action object as a field called payload. The action creator function
 * will also have its toString() overriden so that it returns the action type,
 * allowing it to be used in reducer logic that is looking for that action type.
 *
 * @param type
 */
export function createAction<P = any, T = any>(
  type: T
): ActionCreator<PayloadAction<P, T>>

/* createReducer() */

/**
 * An *action handler* is a reducer for a speficic action type passed to
 * `createReducer()`. In contrast to a normal Redux reducer, it is never
 * called with an `undefined` state because the initial state is explicitly
 * passed as the first argument to `createReducer()`.
 */
export interface ActionHandler<S, A> {
  (state: S, action: A): S
}

/**
 * A mapping from action types to action handlers, meant to be passed to
 * `createReducer()`.
 */
export interface ActionHandlersMapObject<S, A extends Action = AnyAction> {
  [actionType: string]: ActionHandler<S, A>
}

/**
 * A utility function to create reducers that handle specific action types.
 * case reducer functions. Internally, it uses the `immer` library, so you
 * can write code in your case reducers that mutates the existing state value,
 * and it will correctly generate immutably-updated state values instead.
 *
 * @param initialState The initial state to be returned by the reducer.
 * @param actionsMap A mapping from action types to action handlers
 *   (action-type-specific reducer functions).
 */
export function createReducer<S, A extends Action = AnyAction>(
  initialState: S,
  actionsMap: ActionHandlersMapObject<S, A>
): Reducer<S, A>
