import { Action, AnyAction, Reducer } from 'redux'
import { createAction, PayloadAction } from './createAction'
import { createReducer, CaseReducersMapObject } from './createReducer'

/**
 * An action creator atttached to a slice.
 */
export type SliceActionCreator<P> = (payload: P) => PayloadAction<P>

/**
 * A "slice" is a reducer with attached set of action creators. Each of the
 * corresponding action types is considered to be "owned" by the slice, and
 * is namespaced with the slice's name.
 */
export interface Slice<
  S = any,
  A extends Action = AnyAction,
  AP extends { [key: string]: any } = { [key: string]: any }
> extends Reducer<S, A> {
  /**
   * The slice's name. Used as namespace for the slice's action types.
   */
  sliceName: string

  /**
   * The action creators for the action types "owned" by the slice.
   */
  actions: { [type in keyof AP]: SliceActionCreator<AP[type]> }
}

/**
 * Options for `createSlice()`.
 */
export interface CreateSliceOptions<
  S = any,
  A extends Action = AnyAction,
  CR extends CaseReducersMapObject<S, A> = CaseReducersMapObject<S, A>,
  CR2 extends CaseReducersMapObject<S, A> = CaseReducersMapObject<S, A>
> {
  /**
   * The slice's name. Used to namespace the generated action types.
   */
  name: string

  /**
   * The initial state to be returned by the slice reducer.
   */
  initialState: S

  /**
   * An object whose keys are names of actions to generate action
   * creators for, and whose values are *case reducers* to handle
   * these actions. The latter are passed to `createReducer()`
   * (together with the case reducers from `extraReducers`, if
   * specified) to generate the slice reducer.
   */
  actions: CR

  /**
   * A mapping from action types to action-type-specific *case reducer*
   * functions. No action creators are generated for these action types.
   * The case reducers are passed to `createReducer()` (together with
   * the ones from `actions`) to generate the slice reducer.
   */
  extraReducers?: CR2
}

type CaseReducerActionPayloads<
  S,
  A extends PayloadAction,
  CR extends CaseReducersMapObject<S, A>
> = {
  [type in keyof CR]: CR[type] extends (state: S) => any
    ? void
    : (CR[type] extends (state: S, action: PayloadAction<infer P>) => any
        ? P
        : never)
}

function getSliceActionType(slice: string, actionKey: string): string {
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
  A extends PayloadAction = PayloadAction<any>,
  CR extends CaseReducersMapObject<S, A> = CaseReducersMapObject<S, A>
>(
  options: CreateSliceOptions<S, A, CR>
): Slice<S, A, CaseReducerActionPayloads<S, A, CR>> {
  const { name, initialState } = options
  const actionCaseReducers = options.actions || {}
  const extraReducers = options.extraReducers || {}

  if (!name) {
    throw new Error('Missing slice name')
  }

  const actionNames = Object.keys(actionCaseReducers)

  const reducer = createReducer(initialState, {
    ...extraReducers,
    ...actionNames.reduce(
      (map, actionName) => {
        const actionType = getSliceActionType(name, actionName)
        const caseReducer = actionCaseReducers[actionName]
        map[actionType] = caseReducer
        return map
      },
      {} as CaseReducersMapObject<S, A>
    )
  })

  const actions = actionNames.reduce(
    (map, action) => {
      const type = getSliceActionType(name, action)
      map[action] = createAction(type)
      return map
    },
    {} as any
  )

  return Object.assign(reducer, {
    sliceName: name,
    actions
  })
}
