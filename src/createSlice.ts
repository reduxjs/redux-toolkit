import { Reducer, Action } from 'redux'
import {
  createAction,
  PayloadAction,
  PayloadActionCreator,
  PrepareAction,
  ActionCreatorWithoutPayload,
  ActionCreatorWithPreparedPayload
} from './createAction'
import { createReducer, CaseReducers, CaseReducer } from './createReducer'

/**
 * An action creator atttached to a slice.
 *
 * @deprecated please use PayloadActionCreator directly
 */
export type SliceActionCreator<P> = PayloadActionCreator<P>

export interface Slice<
  CaseReducers extends SliceCaseReducerDefinitions<State, PayloadActions>,
  State = any
> {
  /**
   * The slice name.
   */
  name: string

  /**
   * The slice's reducer.
   */
  reducer: Reducer<State>

  /**
   * Action creators for the types of actions that are handled by the slice
   * reducer.
   */
  actions: CaseReducerActions<CaseReducers>

  caseReducers: OnlyCaseReducers<CaseReducers, State>
}

/**
 * Options for `createSlice()`.
 */
export interface CreateSliceOptions<
  State = any,
  CR extends SliceCaseReducerDefinitions<
    State,
    any
  > = SliceCaseReducerDefinitions<State, any>
> {
  /**
   * The slice's name. Used to namespace the generated action types.
   */
  name: string

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

type CaseReducerWithPrepare<State, Action extends PayloadAction> = {
  reducer: CaseReducer<State, Action>
  prepare: PrepareAction<Action['payload']>
}

type SliceCaseReducerDefinitions<State, PA extends PayloadActions> = {
  [ActionType in keyof PA]:
    | CaseReducer<State, PA[ActionType]>
    | CaseReducerWithPrepare<State, PA[ActionType]>
}

type SliceCaseReducers<State, PA extends PayloadActions> = {
  [ActionType in keyof PA]: CaseReducer<State, PA[ActionType]>
}

type IfIsReducerFunctionWithoutAction<R, True, False = never> = R extends (
  state: any
) => any
  ? True
  : False
type IfIsCaseReducerWithPrepare<R, True, False = never> = R extends {
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

type ActionForReducer<R, ActionType = Action<string>> = R extends (
  state: any,
  action: PayloadAction<infer P>
) => any
  ? PayloadAction<P>
  : R extends {
      reducer(state: any, action: PayloadAction<infer P>): any
    }
  ? PayloadAction<P>
  : unknown

type CaseReducerActions<
  CaseReducers extends SliceCaseReducerDefinitions<any, any>
> = {
  [Type in keyof CaseReducers]: IfIsCaseReducerWithPrepare<
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

type OnlyCaseReducers<
  CaseReducers extends SliceCaseReducerDefinitions<any, any>,
  State = any
> = {
  [Type in keyof CaseReducers]: CaseReducer<
    State,
    ActionForReducer<CaseReducers[Type]>
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

type RestrictCaseReducerDefinitionsToMatchReducerAndPrepare<
  S,
  CR extends SliceCaseReducerDefinitions<S, any>
> = { reducers: SliceCaseReducersCheck<S, NoInfer<CR>> }

function getType(slice: string, actionKey: string): string {
  return `${slice}/${actionKey}`
}

/**
 * A function that accepts an initial state, an object full of reducer
 * functions, and a "slice name", and automatically generates
 * action creators and action types that correspond to the
 * reducers and state.
 *
 * The `reducer` argument is passed to `createReducer()`.
 */
export function createSlice<
  State,
  CaseReducers extends SliceCaseReducerDefinitions<State, any>
>(
  options: CreateSliceOptions<State, CaseReducers> &
    RestrictCaseReducerDefinitionsToMatchReducerAndPrepare<State, CaseReducers>
): Slice<CaseReducers, State>

// internal definition is a little less restrictive
export function createSlice<
  State,
  CaseReducers extends SliceCaseReducerDefinitions<State, any>
>(
  options: CreateSliceOptions<State, CaseReducers>
): Slice<CaseReducers, State> {
  const { name, initialState } = options
  if (!name) {
    throw new Error('`name` is a required option for createSlice')
  }
  const reducers = options.reducers || {}
  const extraReducers = options.extraReducers || {}
  const reducerNames = Object.keys(reducers)

  const sliceCaseReducersByName: SliceCaseReducers<State, any> = {}
  const sliceCaseReducersByType: SliceCaseReducers<State, any> = {}
  const actionCreators: any = {}

  reducerNames.forEach(reducerName => {
    const maybeReducerWithPrepare = reducers[reducerName]
    const type = getType(name, reducerName)

    let caseReducer: CaseReducer<State, any>
    let prepareCallback: PrepareAction<any> | undefined

    if (typeof maybeReducerWithPrepare === 'function') {
      caseReducer = maybeReducerWithPrepare
    } else {
      caseReducer = maybeReducerWithPrepare.reducer
      prepareCallback = maybeReducerWithPrepare.prepare
    }

    sliceCaseReducersByName[reducerName] = caseReducer
    sliceCaseReducersByType[type] = caseReducer
    actionCreators[reducerName] = prepareCallback
      ? createAction(type, prepareCallback)
      : createAction(type)
  })

  const finalCaseReducers = { ...extraReducers, ...sliceCaseReducersByType }
  const reducer = createReducer(initialState, finalCaseReducers)

  return {
    name,
    reducer,
    actions: actionCreators,
    caseReducers: sliceCaseReducersByName as any
  }
}
