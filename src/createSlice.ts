import { Reducer, Action } from 'redux'
import { createAction, PayloadAction } from './createAction'
import { createReducer, CaseReducers } from './createReducer'
import { createSliceSelector, createSelectorName } from './sliceSelector'

type Stringify<T> = T extends string ? T : string
/**
 * An action creator atttached to a slice.
 */
export type SliceActionCreator<A> = A extends PayloadAction<infer P, infer T>
  ? unknown extends P // hacky check for payload type `any`, needed so `any` doesn't trigger the ternary check for undefined
    ? {
        (payload: P): PayloadAction<P, T>
        type: T
      }
    : P extends undefined | never | void
    ? {
        (): PayloadAction<P, T>
        type: T
      }
    : {
        (payload: P): PayloadAction<P, T>
        type: T
      }
  : A extends Action<infer T>
  ? {
      (): PayloadAction<undefined, Stringify<T>>
      type: T
    }
  : {
      (): PayloadAction<void>
      type: string
    }

export interface Slice<
  S = any,
  AP extends { [key: string]: any } = { [key: string]: any },
  SN extends string = string
> {
  /**
   * The slice name.
   */
  slice: SN

  /**
   * The slice's reducer.
   */
  reducer: Reducer<S>

  /**
   * Action creators for the types of actions that are handled by the slice
   * reducer.
   */
  actions: { [type in keyof AP]: SliceActionCreator<AP[type]> }

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
  CR extends CaseReducers<S, any> = CaseReducers<S, any>,
  SN extends string = string
> {
  /**
   * The slice's name. Used to namespace the generated action types and to
   * name the selector for retrieving the reducer's state.
   */
  slice?: SN

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

type CaseReducerActions<CR extends CaseReducers<any, any>> = {
  [T in keyof CR]: CR[T] extends (state: any) => any
    ? void
    : (CR[T] extends (state: any, action: infer A) => any
        ? unknown extends A // hacky ternary check for action type `any`
          ? PayloadAction
          : A extends Action
          ? A
          : void
        : void)
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
  S,
  CR extends CaseReducers<S, any>,
  SN extends string = string
>(
  options: CreateSliceOptions<S, CR, SN>
): Slice<S, CaseReducerActions<CR>, SN> {
  const { slice = '' as SN, initialState } = options
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
      map[action] = createAction(type)
      return map
    },
    {} as any
  )

  const selectors = {
    [createSelectorName(slice)]: createSliceSelector<S>(slice)
  }

  return {
    slice,
    reducer,
    actions: actionMap,
    selectors
  }
}
