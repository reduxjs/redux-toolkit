import { Reducer } from 'redux'
import {
  createAction,
  PayloadAction,
  PayloadActionCreator,
  PrepareAction,
  ActionCreatorWithoutPayload,
  ActionCreatorWithPreparedPayload
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
  State = any,
  ActionCreators extends { [key: string]: any } = { [key: string]: any }
> {
  /**
   * The slice name.
   */
  slice: string

  /**
   * The slice's reducer.
   */
  reducer: Reducer<State>

  /**
   * Action creators for the types of actions that are handled by the slice
   * reducer.
   */
  actions: ActionCreators

  /**
   * Selectors for the slice reducer state. `createSlice()` inserts a single
   * selector that returns the entire slice state and whose name is
   * automatically derived from the slice name (e.g., `getCounter` for a slice
   * named `counter`).
   */
  selectors: { [key: string]: (state: any) => State }
}

/**
 * Options for `createSlice()`.
 */
export interface CreateSliceOptions<
  State = any,
  CR extends SliceCaseReducers<State, any> = SliceCaseReducers<State, any>
> {
  /**
   * The slice's name. Used to namespace the generated action types and to
   * name the selector for retrieving the reducer's state.
   */
  slice?: string

  /**
   * The initial state to be returned by the slice reducer.
   */
  initialState: State

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
  extraReducers?: CaseReducers<State, any>
}

type PayloadActions<Types extends keyof any = string> = Record<
  Types,
  PayloadAction
>

type EnhancedCaseReducer<State, Action extends PayloadAction> = {
  reducer: CaseReducer<State, Action>
  prepare: PrepareAction<Action['payload']>
}

type SliceCaseReducers<State, PA extends PayloadActions> = {
  [ActionType in keyof PA]:
    | CaseReducer<State, PA[ActionType]>
    | EnhancedCaseReducer<State, PA[ActionType]>
}

type IfIsReducerFunctionWithoutAction<R, True, False = never> = R extends (
  state: any
) => any
  ? True
  : False
type IfIsEnhancedReducer<R, True, False = never> = R extends {
  prepare: Function
}
  ? True
  : False

type PayloadForReducer<R> = R extends (
  state: any,
  action: PayloadAction<infer P>
) => any
  ? P
  : void
type PrepareActionForReducer<R> = R extends { prepare: infer Prepare }
  ? Prepare
  : never

type CaseReducerActions<CaseReducers extends SliceCaseReducers<any, any>> = {
  [Type in keyof CaseReducers]: IfIsEnhancedReducer<
    CaseReducers[Type],
    ActionCreatorWithPreparedPayload<
      PrepareActionForReducer<CaseReducers[Type]>
    >,
    // else
    IfIsReducerFunctionWithoutAction<
      CaseReducers[Type],
      ActionCreatorWithoutPayload,
      // else
      PayloadActionCreator<PayloadForReducer<CaseReducers[Type]>>
    >
  >
}

type NoInfer<T> = [T][T extends any ? 0 : never]

type SliceCaseReducersCheck<S, ACR> = {
  [P in keyof ACR]: ACR[P] extends {
    reducer(s: S, action?: { payload: infer O }): any
  }
    ? {
        prepare(...a: never[]): { payload: O }
      }
    : {}
}

type RestrictEnhancedReducersToMatchReducerAndPrepare<
  S,
  CR extends SliceCaseReducers<S, any>
> = { reducers: SliceCaseReducersCheck<S, NoInfer<CR>> }

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
  State,
  CaseReducers extends SliceCaseReducers<State, any>
>(
  options: CreateSliceOptions<State, CaseReducers> &
    RestrictEnhancedReducersToMatchReducerAndPrepare<State, CaseReducers>
): Slice<State, CaseReducerActions<CaseReducers>>

// internal definition is a little less restrictive
export function createSlice<
  State,
  CaseReducers extends SliceCaseReducers<State, any>
>(
  options: CreateSliceOptions<State, CaseReducers>
): Slice<State, CaseReducerActions<CaseReducers>> {
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
