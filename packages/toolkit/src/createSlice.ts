import type { Action, UnknownAction, Reducer } from 'redux'
import type {
  ActionCreatorWithoutPayload,
  PayloadAction,
  PayloadActionCreator,
  PrepareAction,
  _ActionCreatorWithPreparedPayload,
} from './createAction'
import { createAction } from './createAction'
import type {
  BuildCreateReducerConfiguration,
  CaseReducer,
  ReducerWithInitialState,
} from './createReducer'
import { buildCreateReducer } from './createReducer'
import type { ActionReducerMapBuilder } from './mapBuilders'
import { executeReducerBuilderCallback } from './mapBuilders'
import { immutableHelpers } from './immer'
import type { Id, Tail } from './tsHelpers'
import type { InjectConfig } from './combineSlices'
import type {
  AsyncThunk,
  AsyncThunkConfig,
  AsyncThunkOptions,
  AsyncThunkPayloadCreator,
  OverrideThunkApiConfigs,
} from './createAsyncThunk'
import { createAsyncThunk } from './createAsyncThunk'

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
  CaseReducers extends SliceCaseReducers<State> = SliceCaseReducers<State>,
  Name extends string = string,
  ReducerPath extends string = Name,
  Selectors extends SliceSelectors<State> = SliceSelectors<State>
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
  actions: CaseReducerActions<CaseReducers, Name>

  /**
   * The individual case reducer functions that were passed in the `reducers` parameter.
   * This enables reuse and testing if they were defined inline when calling `createSlice`.
   */
  caseReducers: SliceDefinedCaseReducers<CaseReducers>

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
    selectState: (rootState: RootState) => State
  ): Id<SliceDefinedSelectors<State, Selectors, RootState>>

  /**
   * Selectors that assume the slice's state is `rootState[slice.reducerPath]` (which is usually the case)
   *
   * Equivalent to `slice.getSelectors((state: RootState) => state[slice.reducerPath])`.
   */
  selectors: Id<
    SliceDefinedSelectors<State, Selectors, { [K in ReducerPath]: State }>
  >

  /**
   * Inject slice into provided reducer (return value from `combineSlices`), and return injected slice.
   */
  injectInto<NewReducerPath extends string = ReducerPath>(
    injectable: {
      inject: (
        slice: { reducerPath: string; reducer: Reducer },
        config?: InjectConfig
      ) => void
    },
    config?: InjectIntoConfig<NewReducerPath>
  ): InjectedSlice<State, CaseReducers, Name, NewReducerPath, Selectors>
}

/**
 * A slice after being called with `injectInto(reducer)`.
 *
 * Selectors can now be called with an `undefined` value, in which case they use the slice's initial state.
 */
interface InjectedSlice<
  State = any,
  CaseReducers extends SliceCaseReducers<State> = SliceCaseReducers<State>,
  Name extends string = string,
  ReducerPath extends string = Name,
  Selectors extends SliceSelectors<State> = SliceSelectors<State>
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
    selectState: (rootState: RootState) => State | undefined
  ): Id<SliceDefinedSelectors<State, Selectors, RootState>>

  /**
   * Selectors that assume the slice's state is `rootState[slice.name]` (which is usually the case)
   *
   * Equivalent to `slice.getSelectors((state: RootState) => state[slice.name])`.
   */
  selectors: Id<
    SliceDefinedSelectors<
      State,
      Selectors,
      { [K in ReducerPath]?: State | undefined }
    >
  >
}

/**
 * Options for `createSlice()`.
 *
 * @public
 */
export interface CreateSliceOptions<
  State = any,
  CR extends SliceCaseReducers<State> = SliceCaseReducers<State>,
  Name extends string = string,
  ReducerPath extends string = Name,
  Selectors extends SliceSelectors<State> = SliceSelectors<State>
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
  reducers:
    | ValidateSliceCaseReducers<State, CR>
    | ((creators: ReducerCreators<State>) => CR)

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

export enum ReducerType {
  reducer = 'reducer',
  reducerWithPrepare = 'reducerWithPrepare',
  asyncThunk = 'asyncThunk',
}

interface ReducerDefinition<T extends ReducerType = ReducerType> {
  _reducerDefinitionType: T
}

export interface CaseReducerDefinition<
  S = any,
  A extends Action = UnknownAction
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
  Action extends PayloadAction
> extends CaseReducerWithPrepare<State, Action>,
    ReducerDefinition<ReducerType.reducerWithPrepare> {}

export interface AsyncThunkSliceReducerConfig<
  State,
  ThunkArg extends any,
  Returned = unknown,
  ThunkApiConfig extends AsyncThunkConfig = {}
> {
  pending?: CaseReducer<
    State,
    ReturnType<AsyncThunk<Returned, ThunkArg, ThunkApiConfig>['pending']>
  >
  rejected?: CaseReducer<
    State,
    ReturnType<AsyncThunk<Returned, ThunkArg, ThunkApiConfig>['rejected']>
  >
  fulfilled?: CaseReducer<
    State,
    ReturnType<AsyncThunk<Returned, ThunkArg, ThunkApiConfig>['fulfilled']>
  >
  options?: AsyncThunkOptions<ThunkArg, ThunkApiConfig>
}

export interface AsyncThunkSliceReducerDefinition<
  State,
  ThunkArg extends any,
  Returned = unknown,
  ThunkApiConfig extends AsyncThunkConfig = {}
> extends AsyncThunkSliceReducerConfig<
      State,
      ThunkArg,
      Returned,
      ThunkApiConfig
    >,
    ReducerDefinition<ReducerType.asyncThunk> {
  payloadCreator: AsyncThunkPayloadCreator<Returned, ThunkArg, ThunkApiConfig>
}

/**
 * Providing these as part of the config would cause circular types, so we disallow passing them
 */
type PreventCircular<ThunkApiConfig> = {
  [K in keyof ThunkApiConfig]: K extends 'state' | 'dispatch'
    ? never
    : ThunkApiConfig[K]
}

interface AsyncThunkCreator<
  State,
  CurriedThunkApiConfig extends PreventCircular<AsyncThunkConfig> = PreventCircular<AsyncThunkConfig>
> {
  <ThunkArg extends any, Returned = unknown>(
    payloadCreator: AsyncThunkPayloadCreator<
      Returned,
      ThunkArg,
      CurriedThunkApiConfig
    >,
    config?: AsyncThunkSliceReducerConfig<
      State,
      ThunkArg,
      Returned,
      CurriedThunkApiConfig
    >
  ): AsyncThunkSliceReducerDefinition<
    State,
    ThunkArg,
    Returned,
    CurriedThunkApiConfig
  >
  <
    ThunkArg extends any,
    Returned = unknown,
    ThunkApiConfig extends PreventCircular<AsyncThunkConfig> = {}
  >(
    payloadCreator: AsyncThunkPayloadCreator<
      Returned,
      ThunkArg,
      ThunkApiConfig
    >,
    config?: AsyncThunkSliceReducerConfig<
      State,
      ThunkArg,
      Returned,
      ThunkApiConfig
    >
  ): AsyncThunkSliceReducerDefinition<State, ThunkArg, Returned, ThunkApiConfig>
  withTypes<
    ThunkApiConfig extends PreventCircular<AsyncThunkConfig>
  >(): AsyncThunkCreator<
    State,
    OverrideThunkApiConfigs<CurriedThunkApiConfig, ThunkApiConfig>
  >
}

export interface ReducerCreators<State> {
  reducer(
    caseReducer: CaseReducer<State, PayloadAction>
  ): CaseReducerDefinition<State, PayloadAction>
  reducer<Payload>(
    caseReducer: CaseReducer<State, PayloadAction<Payload>>
  ): CaseReducerDefinition<State, PayloadAction<Payload>>

  asyncThunk: AsyncThunkCreator<State>

  preparedReducer<Prepare extends PrepareAction<any>>(
    prepare: Prepare,
    reducer: CaseReducer<
      State,
      ReturnType<_ActionCreatorWithPreparedPayload<Prepare>>
    >
  ): {
    _reducerDefinitionType: ReducerType.reducerWithPrepare
    prepare: Prepare
    reducer: CaseReducer<
      State,
      ReturnType<_ActionCreatorWithPreparedPayload<Prepare>>
    >
  }
}

/**
 * The type describing a slice's `reducers` option.
 *
 * @public
 */
export type SliceCaseReducers<State> =
  | Record<
      string,
      | CaseReducerDefinition<State, PayloadAction<any>>
      | CaseReducerWithPrepareDefinition<
          State,
          PayloadAction<any, string, any, any>
        >
      | AsyncThunkSliceReducerDefinition<State, any, any, any>
    >
  | Record<
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

type SliceActionType<
  SliceName extends string,
  ActionName extends keyof any
> = ActionName extends string | number ? `${SliceName}/${ActionName}` : string

/**
 * Derives the slice's `actions` property from the `reducers` options
 *
 * @public
 */
export type CaseReducerActions<
  CaseReducers extends SliceCaseReducers<any>,
  SliceName extends string
> = {
  [Type in keyof CaseReducers]: CaseReducers[Type] extends infer Definition
    ? Definition extends { prepare: any }
      ? ActionCreatorForCaseReducerWithPrepare<
          Definition,
          SliceActionType<SliceName, Type>
        >
      : Definition extends AsyncThunkSliceReducerDefinition<
          any,
          infer ThunkArg,
          infer Returned,
          infer ThunkApiConfig
        >
      ? AsyncThunk<Returned, ThunkArg, ThunkApiConfig>
      : Definition extends { reducer: any }
      ? ActionCreatorForCaseReducer<
          Definition['reducer'],
          SliceActionType<SliceName, Type>
        >
      : ActionCreatorForCaseReducer<
          Definition,
          SliceActionType<SliceName, Type>
        >
    : never
}

/**
 * Get a `PayloadActionCreator` type for a passed `CaseReducerWithPrepare`
 *
 * @internal
 */
type ActionCreatorForCaseReducerWithPrepare<
  CR extends { prepare: any },
  Type extends string
> = _ActionCreatorWithPreparedPayload<CR['prepare'], Type>

/**
 * Get a `PayloadActionCreator` type for a passed `CaseReducer`
 *
 * @internal
 */
type ActionCreatorForCaseReducer<CR, Type extends string> = CR extends (
  state: any,
  action: infer Action
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
type SliceDefinedCaseReducers<CaseReducers extends SliceCaseReducers<any>> = {
  [Type in keyof CaseReducers]: CaseReducers[Type] extends infer Definition
    ? Definition extends AsyncThunkSliceReducerDefinition<any, any, any, any>
      ? Id<Pick<Required<Definition>, 'fulfilled' | 'rejected' | 'pending'>>
      : Definition extends {
          reducer: infer Reducer
        }
      ? Reducer
      : Definition
    : never
}

/**
 * Extracts the final selector type from the `selectors` object.
 *
 * Removes the `string` index signature from the default value.
 */
type SliceDefinedSelectors<
  State,
  Selectors extends SliceSelectors<State>,
  RootState
> = {
  [K in keyof Selectors as string extends K ? never : K]: (
    rootState: RootState,
    ...args: Tail<Parameters<Selectors[K]>>
  ) => ReturnType<Selectors[K]>
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
  ACR extends SliceCaseReducers<S>
> = ACR &
  {
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

export type CreateSlice = {
  /**
   * A function that accepts an initial state, an object full of reducer
   * functions, and a "slice name", and automatically generates
   * action creators and action types that correspond to the
   * reducers and state.
   *
   * The `reducer` argument is passed to `createReducer()`.
   *
   * @public
   */
  <
    State,
    CaseReducers extends SliceCaseReducers<State>,
    Name extends string,
    Selectors extends SliceSelectors<State>,
    ReducerPath extends string = Name
  >(
    options: CreateSliceOptions<
      State,
      CaseReducers,
      Name,
      ReducerPath,
      Selectors
    >
  ): Slice<State, CaseReducers, Name, ReducerPath, Selectors>
}

export interface BuildCreateSliceConfiguration
  extends BuildCreateReducerConfiguration {}

export function buildCreateSlice(
  configuration: BuildCreateSliceConfiguration
): CreateSlice {
  const createReducer = buildCreateReducer(configuration)

  return function createSlice<
    State,
    CaseReducers extends SliceCaseReducers<State>,
    Name extends string,
    Selectors extends SliceSelectors<State>,
    ReducerPath extends string = Name
  >(
    options: CreateSliceOptions<
      State,
      CaseReducers,
      Name,
      ReducerPath,
      Selectors
    >
  ): Slice<State, CaseReducers, Name, ReducerPath, Selectors> {
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
          'You must provide an `initialState` value that is not `undefined`. You may have misspelled `initialState`'
        )
      }
    }
    const reducers =
      (typeof options.reducers === 'function'
        ? options.reducers(buildReducerCreators<State>())
        : options.reducers) || {}

    const reducerNames = Object.keys(reducers)

    const context: ReducerHandlingContext<State> = {
      sliceCaseReducersByName: {},
      sliceCaseReducersByType: {},
      actionCreators: {},
    }

    reducerNames.forEach((reducerName) => {
      const reducerDefinition = reducers[reducerName]
      const reducerDetails: ReducerDetails = {
        reducerName,
        type: getType(name, reducerName),
        createNotation: typeof options.reducers === 'function',
      }
      if (isAsyncThunkSliceReducerDefinition<State>(reducerDefinition)) {
        handleThunkCaseReducerDefinition(
          reducerDetails,
          reducerDefinition,
          context
        )
      } else {
        handleNormalReducerDefinition<State>(
          reducerDetails,
          reducerDefinition,
          context
        )
      }
    })

    function buildReducer() {
      if (process.env.NODE_ENV !== 'production') {
        if (typeof options.extraReducers === 'object') {
          throw new Error(
            "The object notation for `createSlice.extraReducers` has been removed. Please use the 'builder callback' notation instead: https://redux-toolkit.js.org/api/createSlice"
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
        ...context.sliceCaseReducersByType,
      }

      return createReducer(options.initialState, (builder) => {
        for (let key in finalCaseReducers) {
          builder.addCase(key, finalCaseReducers[key] as CaseReducer<any>)
        }
        for (let m of actionMatchers) {
          builder.addMatcher(m.matcher, m.reducer)
        }
        if (defaultCaseReducer) {
          builder.addDefaultCase(defaultCaseReducer)
        }
      })
    }

    const defaultSelectSlice = (
      rootState: { [K in ReducerPath]: State }
    ): State => rootState[reducerPath]

    const selectSelf = (state: State) => state

    const injectedSelectorCache = new WeakMap<
      Slice<State, CaseReducers, Name, ReducerPath, Selectors>,
      WeakMap<
        (rootState: any) => State | undefined,
        Record<string, (rootState: any) => any>
      >
    >()

    let _reducer: ReducerWithInitialState<State>

    const slice: Slice<State, CaseReducers, Name, ReducerPath, Selectors> = {
      name,
      reducerPath,
      reducer(state, action) {
        if (!_reducer) _reducer = buildReducer()

        return _reducer(state, action)
      },
      actions: context.actionCreators as any,
      caseReducers: context.sliceCaseReducersByName as any,
      getInitialState() {
        if (!_reducer) _reducer = buildReducer()

        return _reducer.getInitialState()
      },
      getSelectors(selectState: (rootState: any) => State = selectSelf) {
        let selectorCache = injectedSelectorCache.get(this)
        if (!selectorCache) {
          selectorCache = new WeakMap()
          injectedSelectorCache.set(this, selectorCache)
        }
        let cached = selectorCache.get(selectState)
        if (!cached) {
          cached = {}
          for (const [name, selector] of Object.entries(
            options.selectors ?? {}
          )) {
            cached[name] = (rootState: any, ...args: any[]) => {
              let sliceState = selectState(rootState)
              if (typeof sliceState === 'undefined') {
                // check if injectInto has been called
                if (this !== slice) {
                  sliceState = this.getInitialState()
                } else if (process.env.NODE_ENV !== 'production') {
                  throw new Error(
                    'selectState returned undefined for an uninjected slice reducer'
                  )
                }
              }
              return selector(sliceState, ...args)
            }
          }
          selectorCache.set(selectState, cached)
        }
        return cached as any
      },
      get selectors() {
        return this.getSelectors(defaultSelectSlice)
      },
      injectInto(injectable, { reducerPath: pathOpt, ...config } = {}) {
        const reducerPath = pathOpt ?? this.reducerPath
        injectable.inject({ reducerPath, reducer: this.reducer }, config)
        const selectSlice = (state: any) => state[reducerPath]
        return {
          ...this,
          reducerPath,
          get selectors() {
            return this.getSelectors(selectSlice)
          },
        } as any
      },
    }
    return slice
  }
}

interface ReducerHandlingContext<State> {
  sliceCaseReducersByName: Record<
    string,
    | CaseReducer<State, any>
    | Pick<
        AsyncThunkSliceReducerDefinition<State, any, any, any>,
        'fulfilled' | 'rejected' | 'pending'
      >
  >
  sliceCaseReducersByType: Record<string, CaseReducer<State, any>>
  actionCreators: Record<string, Function>
}

interface ReducerDetails {
  reducerName: string
  type: string
  createNotation: boolean
}

function buildReducerCreators<State>(): ReducerCreators<State> {
  function asyncThunk(
    payloadCreator: AsyncThunkPayloadCreator<any, any>,
    config: AsyncThunkSliceReducerConfig<State, any>
  ): AsyncThunkSliceReducerDefinition<State, any> {
    return {
      _reducerDefinitionType: ReducerType.asyncThunk,
      payloadCreator,
      ...config,
    }
  }
  asyncThunk.withTypes = () => asyncThunk
  return {
    reducer(caseReducer: CaseReducer<State, any>) {
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
        } as const
      )
    },
    preparedReducer(prepare, reducer) {
      return {
        _reducerDefinitionType: ReducerType.reducerWithPrepare,
        prepare,
        reducer,
      }
    },
    asyncThunk: asyncThunk as any,
  }
}

function handleNormalReducerDefinition<State>(
  { type, reducerName, createNotation }: ReducerDetails,
  maybeReducerWithPrepare:
    | CaseReducer<State, { payload: any; type: string }>
    | CaseReducerWithPrepare<State, PayloadAction<any, string, any, any>>,
  context: ReducerHandlingContext<State>
) {
  let caseReducer: CaseReducer<State, any>
  let prepareCallback: PrepareAction<any> | undefined
  if ('reducer' in maybeReducerWithPrepare) {
    if (
      createNotation &&
      !isCaseReducerWithPrepareDefinition(maybeReducerWithPrepare)
    ) {
      throw new Error(
        'Please use the `create.preparedReducer` notation for prepared action creators with the `create` notation.'
      )
    }
    caseReducer = maybeReducerWithPrepare.reducer
    prepareCallback = maybeReducerWithPrepare.prepare
  } else {
    caseReducer = maybeReducerWithPrepare
  }
  context.sliceCaseReducersByName[reducerName] = caseReducer
  context.sliceCaseReducersByType[type] = caseReducer
  context.actionCreators[reducerName] = prepareCallback
    ? createAction(type, prepareCallback)
    : createAction(type)
}

function isAsyncThunkSliceReducerDefinition<State>(
  reducerDefinition: any
): reducerDefinition is AsyncThunkSliceReducerDefinition<State, any, any, any> {
  return reducerDefinition._reducerDefinitionType === ReducerType.asyncThunk
}

function isCaseReducerWithPrepareDefinition<State>(
  reducerDefinition: any
): reducerDefinition is CaseReducerWithPrepareDefinition<State, any> {
  return (
    reducerDefinition._reducerDefinitionType === ReducerType.reducerWithPrepare
  )
}

function handleThunkCaseReducerDefinition<State>(
  { type, reducerName }: ReducerDetails,
  reducerDefinition: AsyncThunkSliceReducerDefinition<State, any, any, any>,
  context: ReducerHandlingContext<State>
) {
  const { payloadCreator, fulfilled, pending, rejected, options } =
    reducerDefinition
  const thunk = createAsyncThunk(type, payloadCreator, options as any)
  context.actionCreators[reducerName] = thunk

  if (fulfilled) {
    context.sliceCaseReducersByType[thunk.fulfilled.type] = fulfilled
  }
  if (pending) {
    context.sliceCaseReducersByType[thunk.pending.type] = pending
  }
  if (rejected) {
    context.sliceCaseReducersByType[thunk.rejected.type] = rejected
  }

  context.sliceCaseReducersByName[reducerName] = {
    fulfilled: fulfilled || noop,
    pending: pending || noop,
    rejected: rejected || noop,
  }
}

function noop() {}

export const createSlice = buildCreateSlice(immutableHelpers)
