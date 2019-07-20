import { Reducer } from 'redux'
import {
  createAction,
  PayloadActionCreator,
  PrepareAction
} from './createAction'
import { createReducer, CaseReducers, isEnhancedReducer } from './createReducer'
import { createSliceSelector, createSelectorName } from './sliceSelector'

/**
 * An action creator atttached to a slice.
 *
 * @deprecated please use PayloadActionCreator directly
 */
export type SliceActionCreator<P> = PayloadActionCreator<P>

export interface Slice<
  S = any,
  Actions extends {
    [type: string]: PayloadActionCreator<any, string, any>
  } = {}
> {
  /**
   * The slice name.
   */
  slice: string

  /**
   * The slice's reducer.
   */
  reducer: Reducer<S>

  /**
   * Action creators for the types of actions that are handled by the slice
   * reducer.
   */
  actions: Actions

  /**
   * Selectors for the slice reducer state. `createSlice()` inserts a single
   * selector that returns the entire slice state and whose name is
   * automatically derived from the slice name (e.g., `getCounter` for a slice
   * named `counter`).
   */
  selectors: { [key: string]: (state: any) => S }
}

/**
 * Options for `createSlice()`.
 */
export interface CreateSliceOptions<
  S = any,
  CR extends CaseReducers<S, any> = CaseReducers<S, any>
> {
  /**
   * The slice's name. Used to namespace the generated action types and to
   * name the selector for retrieving the reducer's state.
   */
  slice?: string

  /**
   * The initial state to be returned by the slice reducer.
   */
  initialState: S

  /**
   * A mapping from action types to action-type-specific *case reducer*
   * functions. For every action type, a matching action creator will be
   * generated using `createAction()`.
   */
  reducers: CR

  /**
   * A mapping from action types to action-type-specific *case reducer*
   * functions. These reducers should have existing action types used
   * as the keys, and action creators will _not_ be generated.
   */
  extraReducers?: CaseReducers<S, any>
}

export type MappedSliceActionCreator<P> = P extends {
  prepare: PrepareAction<infer OP>
}
  ? PayloadActionCreator<OP, any, P['prepare']>
  : P extends (state: any) => any
  ? SliceActionCreator<void>
  : P extends (state: any, action: infer Action) => any
  ? Action extends { payload: infer Payload }
    ? SliceActionCreator<Payload>
    : never
  : never

type MappedActions<CR extends CaseReducers<any, any>> = {
  [T in keyof CR]: MappedSliceActionCreator<CR[T]>
}

function getType(slice: string, actionKey: string): string {
  return slice ? `${slice}/${actionKey}` : actionKey
}

/**
 * A function that accepts an initial state, an object full of reducer
 * functions, and optionally a "slice name", and automatically generates
 * action creators, action types, and selectors that correspond to the
 * reducers and state.
 *
 * The `reducer` argument is passed to `createReducer()`.
 */
export function createSlice<S, CR extends CaseReducers<S, any>>(
  options: CreateSliceOptions<S, CR>
): Slice<S, MappedActions<CR>> {
  const { slice = '', initialState } = options
  const reducers = options.reducers || {}
  const extraReducers = options.extraReducers || {}
  const actionKeys = Object.keys(reducers)

  const reducerMap = actionKeys.reduce((map, actionKey) => {
    map[getType(slice, actionKey)] = reducers[actionKey]
    return map
  }, extraReducers)

  const reducer = createReducer(initialState, reducerMap)

  const actionMap = actionKeys.reduce(
    (map, action) => {
      const type = getType(slice, action)
      const reducer = reducers[action]
      if (isEnhancedReducer(reducer)) {
        map[action] = createAction(type, reducer.prepare)
      } else {
        map[action] = createAction(type)
      }
      return map
    },
    {} as any
  )

  const selectors = {
    [createSelectorName(slice)]: createSliceSelector(slice)
  }

  return {
    slice,
    reducer,
    actions: actionMap,
    selectors
  }
}
