import { Immutable } from 'immer'
import { Action, AnyAction, ActionCreator, Reducer } from 'redux'
import { createAction, PayloadAction } from './createAction'
import { createReducer, CaseReducersMapObject } from './createReducer'
import { createSliceSelector, createSelectorName } from './sliceSelector'

export interface Slice<
  S = any,
  A extends Action = AnyAction,
  AT extends string = string
> {
  /**
   * The slice name.
   */
  slice: string

  /**
   * The slice's reducer.
   */
  reducer: Reducer<S, A>

  /**
   * Action creators for the types of actions that are handled by the slice
   * reducer.
   */
  actions: { [type in AT]: ActionCreator<A> }

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
  A extends Action = AnyAction,
  CR extends CaseReducersMapObject<S, A> = CaseReducersMapObject<S, A>
> {
  /**
   * The slice's name. Used to namespace the generated action types and to
   * name the selector for retrieving the reducer's state.
   */
  slice?: string

  /**
   * The initial state to be returned by the slice reducer.
   */
  initialState: Immutable<S>

  /**
   * A mapping from action types to action-type-specific *case reducer*
   * functions. For every action type, a matching action creator will be
   * generated using `createAction()`.
   */
  reducers: CR
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
export function createSlice<
  S = any,
  A extends PayloadAction = PayloadAction,
  CR extends CaseReducersMapObject<S, A> = CaseReducersMapObject<S, A>
>(
  options: CreateSliceOptions<S, A, CR>
): Slice<Immutable<S>, A, Extract<keyof CR, string>> {
  const { slice = '', initialState } = options
  const reducers = options.reducers || {}
  const actionKeys = Object.keys(reducers)

  const reducerMap = actionKeys.reduce(
    (map, actionKey) => {
      map[getType(slice, actionKey)] = reducers[actionKey]
      return map
    },
    {} as CR
  )

  const reducer = createReducer(initialState, reducerMap)

  const actionMap = actionKeys.reduce(
    (map, action) => {
      const type = getType(slice, action)
      map[action] = createAction(type)
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
