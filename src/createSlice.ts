import { Reducer } from 'redux'
import {
  createAction,
  PayloadAction,
  PayloadActionCreator,
  PrepareAction,
  ActionCreatorWithoutPayload,
  _ActionCreatorWithPreparedPayload
} from './createAction'
import { createReducer, CaseReducers, CaseReducer } from './createReducer'
import {
  ActionReducerMapBuilder,
  executeReducerBuilderCallback
} from './mapBuilders'

/**
 * An action creator atttached to a slice.
 *
 * @deprecated please use PayloadActionCreator directly
 */
export type SliceActionCreator<P> = PayloadActionCreator<P>

export interface Slice<
  State = any,
  CaseReducers extends SliceCaseReducerDefinitions<State, PayloadActions> = {
    [key: string]: any
  }
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

  caseReducers: SliceDefinedCaseReducers<CaseReducers, State>
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
   * Alternatively, a callback that receives a *builder* object to define
   * case reducers via calls to `builder.addCase(actionCreatorOrType, reducer)`.
   */
  extraReducers?:
    | CaseReducers<NoInfer<State>, any>
    | ((builder: ActionReducerMapBuilder<NoInfer<State>>) => void)
}

type PayloadActions<Types extends keyof any = string> = Record<
  Types,
  PayloadAction
>

type CaseReducerWithPrepare<State, Action extends PayloadAction> = {
  reducer: CaseReducer<State, Action>
  prepare: PrepareAction<Action['payload']>
}

type SliceCaseReducerDefinitions<State, CR> = {
  [K: string]:
    | CaseReducer<State, PayloadAction<any>>
    | CaseReducerWithPrepare<State, PayloadAction<any>>
} & SliceCaseReducersCheck<State, CR>

type ActionForReducer<R, S> = R extends (
  state: S,
  action: PayloadAction<infer P>
) => S
  ? PayloadAction<P>
  : R extends {
      reducer(state: any, action: PayloadAction<infer P>): any
    }
  ? PayloadAction<P>
  : unknown

type CaseReducerActions<
  CaseReducers extends SliceCaseReducerDefinitions<any, any>
> = {
  [Type in keyof CaseReducers]: CaseReducers[Type] extends { prepare: any }
    ? ActionCreatorForCaseReducerWithPrepare<CaseReducers[Type]>
    : CaseReducers[Type] extends (state: any, action: any) => any
    ? ActionCreatorForCaseReducer<CaseReducers[Type]>
    : never
}

type ActionCreatorForCaseReducerWithPrepare<
  CR extends { prepare: any }
> = _ActionCreatorWithPreparedPayload<CR['prepare'], string>

type ActionCreatorForCaseReducer<CR> = CR extends (
  state: any,
  action: infer Action
) => any
  ? Action extends { payload: infer P }
    ? PayloadActionCreator<P>
    : ActionCreatorWithoutPayload
  : ActionCreatorWithoutPayload

type SliceDefinedCaseReducers<
  CaseReducers extends SliceCaseReducerDefinitions<any, any>,
  State = any
> = {
  [Type in keyof CaseReducers]: CaseReducer<
    State,
    ActionForReducer<CaseReducers[Type], State>
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
  CaseReducers extends SliceCaseReducerDefinitions<State, CaseReducers>
>(
  options: CreateSliceOptions<State, CaseReducers>
): Slice<State, CaseReducers> {
  const { name, initialState } = options
  if (!name) {
    throw new Error('`name` is a required option for createSlice')
  }
  const reducers = options.reducers || {}
  const extraReducers =
    typeof options.extraReducers === 'undefined'
      ? {}
      : typeof options.extraReducers === 'function'
      ? executeReducerBuilderCallback(options.extraReducers)
      : options.extraReducers

  const reducerNames = Object.keys(reducers)

  const sliceCaseReducersByName: Record<string, CaseReducer> = {}
  const sliceCaseReducersByType: Record<string, CaseReducer> = {}
  const actionCreators: Record<string, Function> = {}

  reducerNames.forEach(reducerName => {
    const maybeReducerWithPrepare = reducers[reducerName]
    const type = getType(name, reducerName)

    let caseReducer: CaseReducer<State, any>
    let prepareCallback: PrepareAction<any> | undefined

    if ('reducer' in maybeReducerWithPrepare) {
      caseReducer = maybeReducerWithPrepare.reducer
      prepareCallback = maybeReducerWithPrepare.prepare
    } else {
      caseReducer = maybeReducerWithPrepare
    }

    sliceCaseReducersByName[reducerName] = caseReducer
    sliceCaseReducersByType[type] = caseReducer
    actionCreators[reducerName] = prepareCallback
      ? createAction(type, prepareCallback)
      : createAction(type)
  })

  const finalCaseReducers = { ...extraReducers, ...sliceCaseReducersByType }
  const reducer = createReducer(initialState, finalCaseReducers as any)

  return {
    name,
    reducer,
    actions: actionCreators as any,
    caseReducers: sliceCaseReducersByName as any
  }
}
