import { Reducer } from 'redux'
import {
  createAction,
  PayloadAction,
  PayloadActionCreator,
  PrepareAction
} from './createAction'
import { createReducer, CaseReducers, CaseReducer } from './createReducer'
import { createSliceSelector, createSelectorName } from './sliceSelector'

/**
 * An action creator atttached to a slice.
 *
 * @deprecated please use PayloadActionCreator directly
 */
export type SliceActionCreator<P> = PayloadActionCreator<P>

export interface Slice<
  S = any,
  AC extends { [key: string]: any } = { [key: string]: any }
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
  actions: AC

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
  CR extends SliceCaseReducers<S, any> = SliceCaseReducers<S, any>
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

type PayloadActions<T extends keyof any = string> = Record<T, PayloadAction>

type EnhancedCaseReducer<S, A extends PayloadAction> = {
  reducer: CaseReducer<S, A>
  prepare: PrepareAction<A['payload']>
}

type SliceCaseReducers<S, PA extends PayloadActions> = {
  [T in keyof PA]: CaseReducer<S, PA[T]> | EnhancedCaseReducer<S, PA[T]>
}

type CaseReducerActions<CR extends SliceCaseReducers<any, any>> = {
  [T in keyof CR]: CR[T] extends (state: any) => any
    ? PayloadActionCreator<void>
    : (CR[T] extends (state: any, action: PayloadAction<infer P>) => any
        ? PayloadActionCreator<P>
        : CR[T] extends { prepare: PrepareAction<infer P> }
        ? PayloadActionCreator<P, string, CR[T]['prepare']>
        : PayloadActionCreator<void>)
}

type NoInfer<T> = [T][T extends any ? 0 : never];
type SliceCaseReducersCheck<S, ACR> = {
    [P in keyof ACR] : ACR[P] extends {
        reducer(s:S, action?: { payload: infer O }): any 
    } ? {
        prepare(...a:never[]): { payload: O }
    } : {

    }
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
export function createSlice<S, CR extends SliceCaseReducers<S, any>>(
  options: CreateSliceOptions<S, CR> & { reducers: SliceCaseReducersCheck<S, NoInfer<CR>> }
): Slice<S, CaseReducerActions<CR>>
export function createSlice<S, CR extends SliceCaseReducers<S, any>>(
  options: CreateSliceOptions<S, CR>
): Slice<S, CaseReducerActions<CR>> {
  const { slice = '', initialState } = options
  const reducers = options.reducers || {}
  const extraReducers = options.extraReducers || {}
  const actionKeys = Object.keys(reducers)

  const reducerMap = actionKeys.reduce((map, actionKey) => {
    let maybeEnhancedReducer = reducers[actionKey]
    map[getType(slice, actionKey)] =
      typeof maybeEnhancedReducer === 'function'
        ? maybeEnhancedReducer
        : maybeEnhancedReducer.reducer
    return map
  }, extraReducers)

  const reducer = createReducer(initialState, reducerMap)

  const actionMap = actionKeys.reduce(
    (map, action) => {
      let maybeEnhancedReducer = reducers[action]
      const type = getType(slice, action)
      map[action] =
        typeof maybeEnhancedReducer === 'function'
          ? createAction(type)
          : createAction(type, maybeEnhancedReducer.prepare)
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
