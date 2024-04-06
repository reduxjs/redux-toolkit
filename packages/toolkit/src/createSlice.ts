import type { Action, UnknownAction, Reducer } from 'redux'
import type { Selector } from 'reselect'
import type {
  AsyncThunkCreator,
  AsyncThunkSliceReducerDefinition,
} from './asyncThunkCreator'
import type {
  ActionCreatorWithoutPayload,
  PayloadAction,
  PayloadActionCreator,
  PrepareAction,
  _ActionCreatorWithPreparedPayload,
} from './createAction'
import { createAction } from './createAction'
import type { AsyncThunk } from './createAsyncThunk'
import type {
  ActionMatcherDescriptionCollection,
  CaseReducer,
  ReducerWithInitialState,
} from './createReducer'
import { createReducer, makeGetInitialState } from './createReducer'
import type { ActionReducerMapBuilder, TypedActionCreator } from './mapBuilders'
import { executeReducerBuilderCallback } from './mapBuilders'
import type { CastAny, Id, TypeGuard, UnionToIntersection } from './tsHelpers'
import type { InjectConfig } from './combineSlices'
import { emplace } from './utils'
import { DistributiveOmit } from 'react-redux'

export enum ReducerType {
  reducer = 'reducer',
  reducerWithPrepare = 'reducerWithPrepare',
  asyncThunk = 'asyncThunk',
}

export type RegisteredReducerType = keyof SliceReducerCreators<
  any,
  any,
  any,
  any
>

export interface ReducerDefinition<
  T extends RegisteredReducerType = RegisteredReducerType,
> {
  _reducerDefinitionType: T
}

export type ReducerCreatorEntry<
  Create extends (...args: any[]) => any,
  Exposes extends {
    actions?: Record<string, unknown>
    caseReducers?: Record<string, unknown>
  } = {},
> = {
  create: Create
  actions: Exposes extends { actions: NonNullable<unknown> }
    ? Exposes['actions']
    : {}
  caseReducers: Exposes extends { caseReducers: NonNullable<unknown> }
    ? Exposes['caseReducers']
    : {}
}

export type CreatorCaseReducers<State> =
  | Record<string, ReducerDefinition>
  | SliceCaseReducers<State>

export interface SliceReducerCreators<
  State,
  CaseReducers extends CreatorCaseReducers<State>,
  Name extends string,
  ReducerPath extends string,
> {
  [ReducerType.reducer]: ReducerCreatorEntry<
    {
      (
        caseReducer: CaseReducer<State, PayloadAction>,
      ): CaseReducerDefinition<State, PayloadAction>
      <Payload = any>(
        caseReducer: CaseReducer<State, PayloadAction<Payload>>,
      ): CaseReducerDefinition<State, PayloadAction<Payload>>
    },
    {
      actions: {
        [ReducerName in keyof CaseReducers]: CaseReducers[ReducerName] extends CaseReducer<
          State,
          any
        >
          ? ActionCreatorForCaseReducer<
              CaseReducers[ReducerName],
              SliceActionType<Name, ReducerName>
            >
          : never
      }
      caseReducers: {
        [ReducerName in keyof CaseReducers]: CaseReducers[ReducerName] extends CaseReducer<
          State,
          any
        >
          ? CaseReducers[ReducerName]
          : never
      }
    }
  >
  [ReducerType.reducerWithPrepare]: ReducerCreatorEntry<
    <Prepare extends PrepareAction<any>>(
      prepare: Prepare,
      reducer: CaseReducer<
        State,
        ReturnType<_ActionCreatorWithPreparedPayload<Prepare>>
      >,
    ) => PreparedCaseReducerDefinition<State, Prepare>,
    {
      actions: {
        [ReducerName in keyof CaseReducers as ReducerName]: CaseReducers[ReducerName] extends CaseReducerWithPrepare<
          State,
          any
        >
          ? CaseReducers[ReducerName] extends { prepare: any }
            ? ActionCreatorForCaseReducerWithPrepare<
                CaseReducers[ReducerName],
                SliceActionType<Name, ReducerName>
              >
            : never
          : never
      }
      caseReducers: {
        [ReducerName in keyof CaseReducers]: CaseReducers[ReducerName] extends CaseReducerWithPrepare<
          State,
          any
        >
          ? CaseReducers[ReducerName] extends { reducer: infer Reducer }
            ? Reducer
            : never
          : never
      }
    }
  >
  [ReducerType.asyncThunk]: ReducerCreatorEntry<
    AsyncThunkCreator<State>,
    {
      actions: {
        [ReducerName in keyof CaseReducers]: CaseReducers[ReducerName] extends AsyncThunkSliceReducerDefinition<
          State,
          infer ThunkArg,
          infer Returned,
          infer ThunkApiConfig
        >
          ? AsyncThunk<Returned, ThunkArg, ThunkApiConfig>
          : never
      }
      caseReducers: {
        [ReducerName in keyof CaseReducers]: CaseReducers[ReducerName] extends AsyncThunkSliceReducerDefinition<
          State,
          any,
          any,
          any
        >
          ? Id<
              Pick<
                Required<CaseReducers[ReducerName]>,
                'fulfilled' | 'rejected' | 'pending' | 'settled'
              >
            >
          : never
      }
    }
  >
}

export type ReducerCreators<
  State,
  Name extends string = string,
  ReducerPath extends string = Name,
  CreatorMap extends Record<string, RegisteredReducerType> = {},
> = {
  reducer: SliceReducerCreators<
    State,
    any,
    Name,
    ReducerPath
  >[ReducerType.reducer]['create']
  preparedReducer: SliceReducerCreators<
    State,
    any,
    Name,
    ReducerPath
  >[ReducerType.reducerWithPrepare]['create']
} & {
  [CreatorName in keyof CreatorMap as SliceReducerCreators<
    State,
    any,
    Name,
    ReducerPath
  >[CreatorMap[CreatorName]]['create'] extends never
    ? never
    : CreatorName]: SliceReducerCreators<
    State,
    any,
    Name,
    ReducerPath
  >[CreatorMap[CreatorName]]['create']
}

interface InternalReducerHandlingContext<State> {
  sliceCaseReducersByType: Record<string, CaseReducer<State, any>>
  sliceMatchers: ActionMatcherDescriptionCollection<State>

  sliceCaseReducersByName: Record<string, any>
  actionCreators: Record<string, any>
}

export interface ReducerHandlingContext<State> {
  /**
   * Adds a case reducer to handle a single action type.
   * @param actionCreator - Either a plain action type string, or an action creator generated by [`createAction`](./createAction) that can be used to determine the action type.
   * @param reducer - The actual case reducer function.
   */
  addCase<ActionCreator extends TypedActionCreator<string>>(
    actionCreator: ActionCreator,
    reducer: CaseReducer<State, ReturnType<ActionCreator>>,
  ): ReducerHandlingContext<State>
  /**
   * Adds a case reducer to handle a single action type.
   * @param actionCreator - Either a plain action type string, or an action creator generated by [`createAction`](./createAction) that can be used to determine the action type.
   * @param reducer - The actual case reducer function.
   */
  addCase<Type extends string, A extends Action<Type>>(
    type: Type,
    reducer: CaseReducer<State, A>,
  ): ReducerHandlingContext<State>

  /**
   * Allows you to match incoming actions against your own filter function instead of only the `action.type` property.
   * @remarks
   * If multiple matcher reducers match, all of them will be executed in the order
   * they were defined in - even if a case reducer already matched.
   * All calls to `builder.addMatcher` must come after any calls to `builder.addCase` and before any calls to `builder.addDefaultCase`.
   * @param matcher - A matcher function. In TypeScript, this should be a [type predicate](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates)
   *   function
   * @param reducer - The actual case reducer function.
   *
   */
  addMatcher<A>(
    matcher: TypeGuard<A>,
    reducer: CaseReducer<State, A extends Action ? A : A & Action>,
  ): ReducerHandlingContext<State>
  /**
   * Add an action to be exposed under the final `slice.actions[reducerName]` key.
   *
   * Should only be called once per handler.
   *
   * @param actionCreator The action to expose.
   * @example
   * context.exposeAction(createAction<Post>(type));
   *
   * export const { addPost } = slice.actions
   *
   * dispatch(addPost(post))
   */
  exposeAction(actionCreator: unknown): ReducerHandlingContext<State>

  /**
   * Add a case reducer to be exposed under the final `slice.caseReducers[reducerName]` key.
   *
   * Should only be called once per handler.
   *
   * @param reducer The reducer to expose.
   * @example
   * context.exposeCaseReducer((state, action: PayloadAction<Post>) => {
   *   state.push(action.payload)
   * })
   *
   * slice.caseReducers.addPost([], addPost(post))
   */
  exposeCaseReducer(reducer: unknown): ReducerHandlingContext<State>

  /**
   * Provides access to the initial state value given to the slice.
   * If a lazy state initializer was provided, it will be called and a fresh value returned.
   */
  getInitialState(): State

  /**
   * Tries to select the slice's state from a possible root state shape, using `reducerPath`.
   * Throws an error if slice's state is not found.
   *
   * *Note that only the original `reducerPath` option is used - if a different `reducerPath` is used when injecting, this will not be reflected.*
   */
  selectSlice(state: Record<string, unknown>): State
}

export interface ReducerDetails {
  /** The name of the slice */
  sliceName: string
  /** The reducerPath option passed for the slice. Defaults to `sliceName` if not provided. */
  reducerPath: string
  /** The key the reducer was defined under */
  reducerName: string
  /** The predefined action type, i.e. `${sliceName}/${reducerName}` */
  type: string
}

type RecursiveExtractDefinition<
  Definitions,
  Type extends RegisteredReducerType,
> = CastAny<
  | Extract<Definitions, ReducerDefinition<Type>>
  | (Definitions extends object
      ? {
          [K in keyof Definitions]-?: RecursiveExtractDefinition<
            Definitions[K],
            Type
          >
        }[keyof Definitions]
      : never),
  never
>

type ReducerDefinitionsForType<Type extends RegisteredReducerType> = {
  [CreatorType in RegisteredReducerType]:
    | RecursiveExtractDefinition<
        ReturnType<
          SliceReducerCreators<any, any, any, any>[CreatorType]['create']
        >,
        Type
      >
    | {
        [K in keyof SliceReducerCreators<
          any,
          any,
          any,
          any
        >[CreatorType]['create']]: SliceReducerCreators<
          any,
          any,
          any,
          any
        >[CreatorType]['create'][K] extends (
          ...args: any[]
        ) => infer Definitions
          ? RecursiveExtractDefinition<Definitions, Type>
          : never
      }[keyof SliceReducerCreators<any, any, any, any>[CreatorType]['create']]
}[RegisteredReducerType]

export type ReducerCreator<Type extends RegisteredReducerType> = {
  type: Type
  create: SliceReducerCreators<any, any, any, any>[Type]['create']
} & (ReducerDefinitionsForType<Type> extends never
  ? {}
  : {
      handle<State>(
        details: ReducerDetails,
        definition: ReducerDefinitionsForType<Type>,
        context: ReducerHandlingContext<State>,
      ): void
    })

interface InjectIntoConfig<NewReducerPath extends string> extends InjectConfig {
  reducerPath?: NewReducerPath
}

/**
 * The return value of `createSlice`
 *
 * @public
 */
export interface Slice<
  State = any,
  CaseReducers extends CreatorCaseReducers<State> = SliceCaseReducers<State>,
  Name extends string = string,
  ReducerPath extends string = Name,
  Selectors extends SliceSelectors<State> = SliceSelectors<State>,
> {
  /**
   * The slice name.
   */
  name: Name

  /**
   *  The slice reducer path.
   */
  reducerPath: ReducerPath

  /**
   * The slice's reducer.
   */
  reducer: Reducer<State>

  /**
   * Action creators for the types of actions that are handled by the slice
   * reducer.
   */
  actions: CaseReducerActions<CaseReducers, Name, ReducerPath, State>

  /**
   * The individual case reducer functions that were passed in the `reducers` parameter.
   * This enables reuse and testing if they were defined inline when calling `createSlice`.
   */
  caseReducers: SliceDefinedCaseReducers<CaseReducers, Name, ReducerPath, State>

  /**
   * Provides access to the initial state value given to the slice.
   * If a lazy state initializer was provided, it will be called and a fresh value returned.
   */
  getInitialState: () => State

  /**
   * Get localised slice selectors (expects to be called with *just* the slice's state as the first parameter)
   */
  getSelectors(): Id<SliceDefinedSelectors<State, Selectors, State>>

  /**
   * Get globalised slice selectors (`selectState` callback is expected to receive first parameter and return slice state)
   */
  getSelectors<RootState>(
    selectState: (rootState: RootState) => State,
  ): Id<SliceDefinedSelectors<State, Selectors, RootState>>

  /**
   * Selectors that assume the slice's state is `rootState[slice.reducerPath]` (which is usually the case)
   *
   * Equivalent to `slice.getSelectors((state: RootState) => state[slice.reducerPath])`.
   */
  get selectors(): Id<
    SliceDefinedSelectors<State, Selectors, Record<ReducerPath, State>>
  >

  /**
   * Inject slice into provided reducer (return value from `combineSlices`), and return injected slice.
   */
  injectInto<NewReducerPath extends string = ReducerPath>(
    this: this,
    injectable: {
      inject: (
        slice: { reducerPath: string; reducer: Reducer },
        config?: InjectConfig,
      ) => void
    },
    config?: InjectIntoConfig<NewReducerPath>,
  ): InjectedSlice<State, CaseReducers, Name, NewReducerPath, Selectors>

  /**
   * Select the slice state, using the slice's current reducerPath.
   *
   * Will throw an error if slice is not found.
   */
  selectSlice(state: Record<ReducerPath, State>): State
}

/**
 * A slice after being called with `injectInto(reducer)`.
 *
 * Selectors can now be called with an `undefined` value, in which case they use the slice's initial state.
 */
interface InjectedSlice<
  State = any,
  CaseReducers extends CreatorCaseReducers<State> = SliceCaseReducers<State>,
  Name extends string = string,
  ReducerPath extends string = Name,
  Selectors extends SliceSelectors<State> = SliceSelectors<State>,
> extends Omit<
    Slice<State, CaseReducers, Name, ReducerPath, Selectors>,
    'getSelectors' | 'selectors'
  > {
  /**
   * Get localised slice selectors (expects to be called with *just* the slice's state as the first parameter)
   */
  getSelectors(): Id<SliceDefinedSelectors<State, Selectors, State | undefined>>

  /**
   * Get globalised slice selectors (`selectState` callback is expected to receive first parameter and return slice state)
   */
  getSelectors<RootState>(
    selectState: (rootState: RootState) => State | undefined,
  ): Id<SliceDefinedSelectors<State, Selectors, RootState>>

  /**
   * Selectors that assume the slice's state is `rootState[slice.name]` (which is usually the case)
   *
   * Equivalent to `slice.getSelectors((state: RootState) => state[slice.name])`.
   */
  get selectors(): Id<
    SliceDefinedSelectors<
      State,
      Selectors,
      { [K in ReducerPath]?: State | undefined }
    >
  >

  /**
   * Select the slice state, using the slice's current reducerPath.
   *
   * Returns initial state if slice is not found.
   */
  selectSlice(state: { [K in ReducerPath]?: State | undefined }): State
}

type CreatorCallback<
  State,
  Name extends string,
  ReducerPath extends string,
  CreatorMap extends Record<string, RegisteredReducerType>,
> = (
  create: ReducerCreators<State, Name, ReducerPath, CreatorMap>,
) => Record<string, ReducerDefinition>

type GetCaseReducers<
  CR extends SliceCaseReducers<any> | CreatorCallback<any, any, any, any>,
> = CR extends CreatorCallback<any, any, any, any> ? ReturnType<CR> : CR

/**
 * Options for `createSlice()`.
 *
 * @public
 */
export interface CreateSliceOptions<
  State = any,
  CR extends
    | SliceCaseReducers<State>
    | CreatorCallback<
        State,
        Name,
        ReducerPath,
        CreatorMap
      > = SliceCaseReducers<State>,
  Name extends string = string,
  ReducerPath extends string = Name,
  Selectors extends SliceSelectors<State> = SliceSelectors<State>,
  CreatorMap extends Record<string, RegisteredReducerType> = {},
> {
  /**
   * The slice's name. Used to namespace the generated action types.
   */
  name: Name

  /**
   * The slice's reducer path. Used when injecting into a combined slice reducer.
   */
  reducerPath?: ReducerPath

  /**
   * The initial state that should be used when the reducer is called the first time. This may also be a "lazy initializer" function, which should return an initial state value when called. This will be used whenever the reducer is called with `undefined` as its state value, and is primarily useful for cases like reading initial state from `localStorage`.
   */
  initialState: State | (() => State)

  /**
   * A mapping from action types to action-type-specific *case reducer*
   * functions. For every action type, a matching action creator will be
   * generated using `createAction()`.
   */
  reducers: ValidateSliceCaseReducers<State, CR>

  /**
   * A callback that receives a *builder* object to define
   * case reducers via calls to `builder.addCase(actionCreatorOrType, reducer)`.
   *
   *
   * @example
```ts
import { createAction, createSlice, Action } from '@reduxjs/toolkit'
const incrementBy = createAction<number>('incrementBy')
const decrement = createAction('decrement')

interface RejectedAction extends Action {
  error: Error
}

function isRejectedAction(action: Action): action is RejectedAction {
  return action.type.endsWith('rejected')
}

createSlice({
  name: 'counter',
  initialState: 0,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(incrementBy, (state, action) => {
        // action is inferred correctly here if using TS
      })
      // You can chain calls, or have separate `builder.addCase()` lines each time
      .addCase(decrement, (state, action) => {})
      // You can match a range of action types
      .addMatcher(
        isRejectedAction,
        // `action` will be inferred as a RejectedAction due to isRejectedAction being defined as a type guard
        (state, action) => {}
      )
      // and provide a default case if no other handlers matched
      .addDefaultCase((state, action) => {})
    }
})
```
   */
  extraReducers?: (builder: ActionReducerMapBuilder<State>) => void

  /**
   * A map of selectors that receive the slice's state and any additional arguments, and return a result.
   */
  selectors?: Selectors
}

export interface CaseReducerDefinition<
  S = any,
  A extends Action = UnknownAction,
> extends CaseReducer<S, A>,
    ReducerDefinition<ReducerType.reducer> {}

/**
 * A CaseReducer with a `prepare` method.
 *
 * @public
 */
export type CaseReducerWithPrepare<State, Action extends PayloadAction> = {
  reducer: CaseReducer<State, Action>
  prepare: PrepareAction<Action['payload']>
}

export interface CaseReducerWithPrepareDefinition<
  State,
  Action extends PayloadAction,
> extends CaseReducerWithPrepare<State, Action>,
    ReducerDefinition<ReducerType.reducerWithPrepare> {}

export interface PreparedCaseReducerDefinition<
  State,
  Prepare extends PrepareAction<any>,
> extends ReducerDefinition<ReducerType.reducerWithPrepare> {
  prepare: Prepare
  reducer: CaseReducer<
    State,
    ReturnType<_ActionCreatorWithPreparedPayload<Prepare>>
  >
}

/**
 * The type describing a slice's `reducers` option.
 *
 * @public
 */
export type SliceCaseReducers<State> = Record<
  string,
  | CaseReducer<State, PayloadAction<any>>
  | CaseReducerWithPrepare<State, PayloadAction<any, string, any, any>>
>

/**
 * The type describing a slice's `selectors` option.
 */
export type SliceSelectors<State> = {
  [K: string]: (sliceState: State, ...args: any[]) => any
}

export type SliceActionType<
  SliceName extends string,
  ActionName extends keyof any,
> = ActionName extends string | number ? `${SliceName}/${ActionName}` : string

type ConvertNeverKeysToUnknown<T> = T extends any
  ? { [K in keyof T]: T[K] extends never ? unknown : T[K] }
  : never

/**
 * Derives the slice's `actions` property from the `reducers` options
 *
 * @public
 */
export type CaseReducerActions<
  CaseReducers extends CreatorCaseReducers<State>,
  SliceName extends string,
  ReducerPath extends string = SliceName,
  State = any,
> = Id<
  UnionToIntersection<
    ConvertNeverKeysToUnknown<
      SliceReducerCreators<
        State,
        CaseReducers,
        SliceName,
        ReducerPath
      >[RegisteredReducerType]['actions']
    >
  >
>

/**
 * Get a `PayloadActionCreator` type for a passed `CaseReducerWithPrepare`
 *
 * @internal
 */
type ActionCreatorForCaseReducerWithPrepare<
  CR extends { prepare: any },
  Type extends string,
> = _ActionCreatorWithPreparedPayload<CR['prepare'], Type>

/**
 * Get a `PayloadActionCreator` type for a passed `CaseReducer`
 *
 * @internal
 */
type ActionCreatorForCaseReducer<CR, Type extends string> = CR extends (
  state: any,
  action: infer Action,
) => any
  ? Action extends { payload: infer P }
    ? PayloadActionCreator<P, Type>
    : ActionCreatorWithoutPayload<Type>
  : ActionCreatorWithoutPayload<Type>

/**
 * Extracts the CaseReducers out of a `reducers` object, even if they are
 * tested into a `CaseReducerWithPrepare`.
 *
 * @internal
 */
type SliceDefinedCaseReducers<
  CaseReducers extends CreatorCaseReducers<State>,
  SliceName extends string = string,
  ReducerPath extends string = SliceName,
  State = any,
> = Id<
  UnionToIntersection<
    ConvertNeverKeysToUnknown<
      SliceReducerCreators<
        State,
        CaseReducers,
        SliceName,
        ReducerPath
      >[RegisteredReducerType]['caseReducers']
    >
  >
>

type RemappedSelector<S extends Selector, NewState> =
  S extends Selector<any, infer R, infer P>
    ? Selector<NewState, R, P> & { unwrapped: S }
    : never

/**
 * Extracts the final selector type from the `selectors` object.
 *
 * Removes the `string` index signature from the default value.
 */
type SliceDefinedSelectors<
  State,
  Selectors extends SliceSelectors<State>,
  RootState,
> = {
  [K in keyof Selectors as string extends K ? never : K]: RemappedSelector<
    Selectors[K],
    RootState
  >
}

/**
 * Used on a SliceCaseReducers object.
 * Ensures that if a CaseReducer is a `CaseReducerWithPrepare`, that
 * the `reducer` and the `prepare` function use the same type of `payload`.
 *
 * Might do additional such checks in the future.
 *
 * This type is only ever useful if you want to write your own wrapper around
 * `createSlice`. Please don't use it otherwise!
 *
 * @public
 */
export type ValidateSliceCaseReducers<
  S,
  ACR extends SliceCaseReducers<S> | CreatorCallback<S, any, any, any>,
> = ACR & {
  [T in keyof ACR]: ACR[T] extends {
    reducer(s: S, action?: infer A): any
  }
    ? {
        prepare(...a: never[]): Omit<A, 'type'>
      }
    : {}
}

function getType(slice: string, actionKey: string): string {
  return `${slice}/${actionKey}`
}

export const reducerCreator: ReducerCreator<ReducerType.reducer> = {
  type: ReducerType.reducer,
  create(caseReducer: CaseReducer<any, any>) {
    return Object.assign(
      {
        // hack so the wrapping function has the same name as the original
        // we need to create a wrapper so the `reducerDefinitionType` is not assigned to the original
        [caseReducer.name](...args: Parameters<typeof caseReducer>) {
          return caseReducer(...args)
        },
      }[caseReducer.name],
      {
        _reducerDefinitionType: ReducerType.reducer,
      } as const,
    )
  },
  handle({ type }, reducer, context) {
    context
      .addCase(type, reducer as any)
      .exposeCaseReducer(reducer)
      .exposeAction(createAction(type))
  },
}

export const preparedReducerCreator: ReducerCreator<ReducerType.reducerWithPrepare> =
  {
    type: ReducerType.reducerWithPrepare,
    create(prepare, reducer) {
      return {
        _reducerDefinitionType: ReducerType.reducerWithPrepare,
        prepare,
        reducer,
      }
    },
    handle({ type }, { prepare, reducer }, context) {
      context
        .addCase(type, reducer)
        .exposeCaseReducer(reducer)
        .exposeAction(createAction(type, prepare))
    },
  }

const isCreatorCallback = (
  reducers: unknown,
): reducers is CreatorCallback<any, any, any, any> =>
  typeof reducers === 'function'

interface BuildCreateSliceConfig<
  CreatorMap extends Record<string, RegisteredReducerType>,
> {
  creators?: {
    [Name in keyof CreatorMap]: Name extends 'reducer' | 'preparedReducer'
      ? never
      : ReducerCreator<CreatorMap[Name]>
  } & { asyncThunk?: ReducerCreator<ReducerType.asyncThunk> }
}

export function buildCreateSlice<
  CreatorMap extends Record<string, RegisteredReducerType> = {},
>({
  creators: creatorMap = {} as NonNullable<
    BuildCreateSliceConfig<CreatorMap>['creators']
  >,
}: BuildCreateSliceConfig<CreatorMap> = {}) {
  const creators: Record<
    string,
    ReducerCreator<RegisteredReducerType>['create']
  > = {
    reducer: reducerCreator.create,
    preparedReducer: preparedReducerCreator.create,
  }
  const handlers: Partial<
    Record<
      RegisteredReducerType,
      ReducerCreator<RegisteredReducerType>['handle']
    >
  > = {
    [ReducerType.reducer]: reducerCreator.handle,
    [ReducerType.reducerWithPrepare]: preparedReducerCreator.handle,
  }

  for (const [name, creator] of Object.entries<
    ReducerCreator<RegisteredReducerType>
  >(creatorMap as any)) {
    if (name === 'reducer' || name === 'preparedReducer') {
      throw new Error('Cannot use reserved creator name: ' + name)
    }
    if (
      creator.type === ReducerType.reducer ||
      creator.type === ReducerType.reducerWithPrepare
    ) {
      throw new Error(
        `Cannot use reserved creator type: ${String(creator.type)}`,
      )
    } else if (
      name === 'asyncThunk' &&
      creator.type !== ReducerType.asyncThunk
    ) {
      throw new Error(
        "If provided, `asyncThunk` creator must be `asyncThunkCreator` from '@reduxjs/toolkit'",
      )
    }
    creators[name] = creator.create
    if ('handle' in creator) {
      handlers[creator.type] = creator.handle
    }
  }
  return function createSlice<
    State,
    CaseReducers extends
      | SliceCaseReducers<State>
      | CreatorCallback<State, Name, ReducerPath, CreatorMap>,
    Name extends string,
    Selectors extends SliceSelectors<State>,
    ReducerPath extends string = Name,
  >(
    options: CreateSliceOptions<
      State,
      CaseReducers,
      Name,
      ReducerPath,
      Selectors,
      CreatorMap
    >,
  ): Slice<State, GetCaseReducers<CaseReducers>, Name, ReducerPath, Selectors> {
    const { name, reducerPath = name as unknown as ReducerPath } = options
    if (!name) {
      throw new Error('`name` is a required option for createSlice')
    }

    if (
      typeof process !== 'undefined' &&
      process.env.NODE_ENV === 'development'
    ) {
      if (options.initialState === undefined) {
        console.error(
          'You must provide an `initialState` value that is not `undefined`. You may have misspelled `initialState`',
        )
      }
    }

    const getInitialState = makeGetInitialState(options.initialState)

    const internalContext: InternalReducerHandlingContext<State> = {
      sliceCaseReducersByName: {},
      sliceCaseReducersByType: {},
      actionCreators: {},
      sliceMatchers: [],
    }

    function getContext({ reducerName }: ReducerDetails) {
      const context: ReducerHandlingContext<State> = {
        addCase(
          typeOrActionCreator: string | TypedActionCreator<any>,
          reducer: CaseReducer<State>,
        ) {
          const type =
            typeof typeOrActionCreator === 'string'
              ? typeOrActionCreator
              : typeOrActionCreator.type
          if (!type) {
            throw new Error(
              '`context.addCase` cannot be called with an empty action type',
            )
          }
          if (type in internalContext.sliceCaseReducersByType) {
            throw new Error(
              '`context.addCase` cannot be called with two reducers for the same action type: ' +
                type,
            )
          }
          internalContext.sliceCaseReducersByType[type] = reducer
          return context
        },
        addMatcher(matcher, reducer) {
          internalContext.sliceMatchers.push({ matcher, reducer })
          return context
        },
        exposeAction(actionCreator) {
          if (reducerName in internalContext.actionCreators) {
            throw new Error(
              'context.exposeAction cannot be called twice for the same reducer definition: ' +
                reducerName,
            )
          }
          internalContext.actionCreators[reducerName] = actionCreator
          return context
        },
        exposeCaseReducer(reducer) {
          if (reducerName in internalContext.sliceCaseReducersByName) {
            throw new Error(
              'context.exposeCaseReducer cannot be called twice for the same reducer definition: ' +
                reducerName,
            )
          }
          internalContext.sliceCaseReducersByName[reducerName] = reducer
          return context
        },
        getInitialState,
        selectSlice(state) {
          const sliceState = state[reducerPath]
          if (typeof sliceState === 'undefined') {
            throw new Error(
              `Could not find "${name}" slice in state. In order for slice creators to use \`context.selectSlice\`, the slice must be nested in the state under its reducerPath: "${reducerPath}"`,
            )
          }
          return sliceState as State
        },
      }
      return context
    }

    if (isCreatorCallback(options.reducers)) {
      const reducers = options.reducers(creators as any)
      for (const [reducerName, reducerDefinition] of Object.entries(reducers)) {
        const { _reducerDefinitionType: type } = reducerDefinition
        if (typeof type === 'undefined') {
          throw new Error(
            'Please use reducer creators passed to callback. Each reducer definition must have a `_reducerDefinitionType` property indicating which handler to use.',
          )
        }
        const handler = handlers[type as RegisteredReducerType]
        if (!handler) {
          throw new Error(`Unsupported reducer type: ${String(type)}`)
        }
        const reducerDetails: ReducerDetails = {
          sliceName: name,
          reducerName,
          reducerPath,
          type: getType(name, reducerName),
        }
        handler(
          reducerDetails,
          reducerDefinition as any,
          getContext(reducerDetails),
        )
      }
    } else {
      for (const [reducerName, reducerDefinition] of Object.entries(
        options.reducers as SliceCaseReducers<State>,
      )) {
        const reducerDetails: ReducerDetails = {
          sliceName: name,
          reducerName,
          reducerPath,
          type: getType(name, reducerName),
        }
        const { handle } =
          'reducer' in reducerDefinition
            ? preparedReducerCreator
            : reducerCreator
        handle(
          reducerDetails,
          reducerDefinition as any,
          getContext(reducerDetails),
        )
      }
    }

    function buildReducer() {
      if (process.env.NODE_ENV !== 'production') {
        if (typeof options.extraReducers === 'object') {
          throw new Error(
            "The object notation for `createSlice.extraReducers` has been removed. Please use the 'builder callback' notation instead: https://redux-toolkit.js.org/api/createSlice",
          )
        }
      }
      const [
        extraReducers = {},
        actionMatchers = [],
        defaultCaseReducer = undefined,
      ] =
        typeof options.extraReducers === 'function'
          ? executeReducerBuilderCallback(options.extraReducers)
          : [options.extraReducers]

      const finalCaseReducers = {
        ...extraReducers,
        ...internalContext.sliceCaseReducersByType,
      }

      return createReducer(options.initialState, (builder) => {
        for (let key in finalCaseReducers) {
          builder.addCase(key, finalCaseReducers[key] as CaseReducer)
        }
        for (let sM of internalContext.sliceMatchers) {
          builder.addMatcher(sM.matcher, sM.reducer)
        }
        for (let m of actionMatchers) {
          builder.addMatcher(m.matcher, m.reducer)
        }
        if (defaultCaseReducer) {
          builder.addDefaultCase(defaultCaseReducer)
        }
      })
    }

    const selectSelf = (state: State) => state

    const injectedSelectorCache = new Map<
      boolean,
      WeakMap<
        (rootState: any) => State | undefined,
        Record<string, (rootState: any) => any>
      >
    >()

    let _reducer: ReducerWithInitialState<State>

    function reducer(state: State | undefined, action: UnknownAction) {
      if (!_reducer) _reducer = buildReducer()

      return _reducer(state, action)
    }

    function makeSelectorProps<CurrentReducerPath extends string = ReducerPath>(
      reducerPath: CurrentReducerPath,
      injected = false,
    ): Pick<
      Slice<
        State,
        GetCaseReducers<CaseReducers>,
        Name,
        CurrentReducerPath,
        Selectors
      >,
      'getSelectors' | 'selectors' | 'selectSlice' | 'reducerPath'
    > {
      function selectSlice(state: { [K in CurrentReducerPath]: State }) {
        let sliceState = state[reducerPath]
        if (typeof sliceState === 'undefined') {
          if (injected) {
            sliceState = getInitialState()
          } else if (process.env.NODE_ENV !== 'production') {
            throw new Error(
              'selectSlice returned undefined for an uninjected slice reducer',
            )
          }
        }
        return sliceState
      }
      function getSelectors(
        selectState: (rootState: any) => State = selectSelf,
      ) {
        const selectorCache = emplace(injectedSelectorCache, injected, {
          insert: () => new WeakMap(),
        })

        return emplace(selectorCache, selectState, {
          insert: () => {
            const map: Record<string, Selector<any, any>> = {}
            for (const [name, selector] of Object.entries(
              options.selectors ?? {},
            )) {
              map[name] = wrapSelector(
                selector,
                selectState,
                getInitialState,
                injected,
              )
            }
            return map
          },
        }) as any
      }
      return {
        reducerPath,
        getSelectors,
        get selectors() {
          return getSelectors(selectSlice)
        },
        selectSlice,
      }
    }

    const slice: Slice<
      State,
      GetCaseReducers<CaseReducers>,
      Name,
      ReducerPath,
      Selectors
    > = {
      name,
      reducer,
      actions: internalContext.actionCreators as any,
      caseReducers: internalContext.sliceCaseReducersByName as any,
      getInitialState,
      ...makeSelectorProps(reducerPath),
      injectInto(injectable, { reducerPath: pathOpt, ...config } = {}) {
        const newReducerPath = pathOpt ?? reducerPath
        injectable.inject({ reducerPath: newReducerPath, reducer }, config)
        return {
          ...slice,
          ...makeSelectorProps(newReducerPath, true),
        } as any
      },
    }
    return slice
  }
}

function wrapSelector<State, NewState, S extends Selector<State>>(
  selector: S,
  selectState: Selector<NewState, State>,
  getInitialState: () => State,
  injected?: boolean,
) {
  function wrapper(rootState: NewState, ...args: any[]) {
    let sliceState = selectState(rootState)
    if (typeof sliceState === 'undefined') {
      if (injected) {
        sliceState = getInitialState()
      } else if (process.env.NODE_ENV !== 'production') {
        throw new Error(
          'selectState returned undefined for an uninjected slice reducer',
        )
      }
    }
    return selector(sliceState, ...args)
  }
  wrapper.unwrapped = selector
  return wrapper as RemappedSelector<S, NewState>
}

/**
 * A function that accepts an initial state, an object full of reducer
 * functions, and a "slice name", and automatically generates
 * action creators and action types that correspond to the
 * reducers and state.
 *
 * @public
 */
export const createSlice = /*@__PURE__*/ buildCreateSlice()
