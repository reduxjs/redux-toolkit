import type { Reducer, UnknownAction } from 'redux'
import type { InjectConfig } from './combineSlices'
import type {
  PayloadAction,
  PayloadActionCreator,
  PrepareAction,
  _ActionCreatorWithPreparedPayload,
} from './createAction'
import type {
  ActionMatcherDescriptionCollection,
  CaseReducer,
  ReducerWithInitialState,
} from './createReducer'
import { createReducerFromCases } from './createReducer'
import type {
  AnyExposure,
  BuiltinSliceCreators,
  CreatorContext,
  PreparedActionExposure,
  ReducerDefinition,
  ReducerDetails,
  ReducerHandlingContext,
  SliceActionExposure,
  ValueExposure,
} from './creators'
import { buildBuiltinCreators, isReducerDefinition } from './creators'
import type { ImmutabilityAdapter } from './immutability'
import { immerAdapter } from './immutability'
import type { ActionReducerMapBuilder } from './mapBuilders'
import { executeReducerBuilderCallback } from './mapBuilders'
import { getOrInsertComputed } from './utils'

/**
 * An object of case reducers, as accepted by the object form of `reducers`.
 *
 * @public
 */
export type SliceCaseReducers<State> = Record<
  string,
  | CaseReducer<State, PayloadAction<any>>
  | CaseReducerWithPrepare<State, PayloadAction<any, string, any, any>>
>

/**
 * A CaseReducer with a `prepare` method.
 *
 * @public
 */
export interface CaseReducerWithPrepare<
  State,
  Action extends PayloadAction<any, string, any, any>,
> {
  reducer: CaseReducer<State, Action>
  prepare: PrepareAction<Action['payload']>
}

/**
 * The object returned by the callback form of `reducers`.
 *
 * @public
 */
export type DefinitionsShape = Record<string, ReducerDefinition<AnyExposure>>

/**
 * The object returned by the `creators` option.
 *
 * @public
 */
export type CreatorsMap = Record<
  string,
  (...args: any[]) => ReducerDefinition<AnyExposure>
>

/**
 * A map of selectors that receive the slice's state as their first argument.
 *
 * @public
 */
export type SliceSelectors<State> = Record<
  string,
  (sliceState: State, ...args: any[]) => any
>

/**
 * The reducers a slice was created with: either the object form of
 * `reducers`, or the definitions returned by its callback form.
 *
 * @public
 */
export type SliceReducers<State> = SliceCaseReducers<State> | DefinitionsShape

/**
 * Derives the action creators (and other exposed values) for a slice's
 * reducers.
 *
 * For the object form, the payload type comes from the case reducer's
 * `action` parameter annotation. For the callback form, it comes from what
 * each definition exposes.
 *
 * @public
 */
export type CaseReducerActions<Reducers, SliceName extends string> = {
  [K in keyof Reducers & string]: Reducers[K] extends ReducerDefinition<infer E>
    ? E extends SliceActionExposure<infer P>
      ? PayloadActionCreator<P, `${SliceName}/${K}`>
      : E extends PreparedActionExposure<infer PA>
        ? _ActionCreatorWithPreparedPayload<PA, `${SliceName}/${K}`>
        : E extends ValueExposure<infer V, any>
          ? V
          : never
    : ActionCreatorForCaseReducer<Reducers[K], `${SliceName}/${K}`>
}

type ActionCreatorForCaseReducer<CR, Type extends string> = CR extends {
  prepare: infer PA extends PrepareAction<any>
}
  ? _ActionCreatorWithPreparedPayload<PA, Type>
  : CR extends (state: any, action: infer A) => any
    ? A extends { payload: infer P }
      ? PayloadActionCreator<P, Type>
      : PayloadActionCreator<void, Type>
    : PayloadActionCreator<void, Type>

/**
 * `slice.caseReducers`: the case reducers that were passed in, with
 * `{ reducer, prepare }` objects unwrapped to `reducer`. For the callback form,
 * the case reducers each definition exposes.
 *
 * @public
 */
export type SliceDefinedCaseReducers<Reducers, State> = {
  [K in keyof Reducers]: Reducers[K] extends ReducerDefinition<infer E>
    ? E extends SliceActionExposure<infer P>
      ? CaseReducer<State, PayloadAction<P>>
      : E extends PreparedActionExposure<infer PA>
        ? CaseReducer<
            State,
            ReturnType<_ActionCreatorWithPreparedPayload<PA, string>>
          >
        : E extends ValueExposure<any, infer CRs>
          ? CRs
          : never
    : Reducers[K] extends { reducer: infer R }
      ? R
      : Reducers[K]
}

/**
 * Slice selectors after being wrapped to receive `RootState`.
 * Removes the `string` index signature of the default `Selectors` type.
 *
 * @public
 */
export type WrappedSliceSelectors<
  State,
  RootState,
  Selectors extends SliceSelectors<State>,
> = {
  [K in keyof Selectors as string extends K ? never : K]: Selectors[K] extends (
    sliceState: State,
    ...args: infer Args
  ) => infer Result
    ? ((rootState: RootState, ...args: Args) => Result) & {
        unwrapped: Selectors[K]
      }
    : never
}

/**
 * Options for `slice.injectInto()`.
 *
 * @public
 */
export interface InjectIntoConfig<
  NewReducerPath extends string,
> extends InjectConfig {
  reducerPath?: NewReducerPath
}

/**
 * Anything a slice can be injected into, such as the reducer returned by
 * `combineSlices`.
 *
 * @public
 */
export interface Injectable {
  inject(
    slice: { reducerPath: string; reducer: Reducer },
    config?: InjectConfig,
  ): unknown
}

/**
 * A slice after being called with `injectInto(reducer)`.
 *
 * Its selectors accept a root state that doesn't contain the slice state yet,
 * in which case they use the slice's initial state.
 *
 * @public
 */
export type InjectedSlice<
  State = any,
  Reducers extends SliceReducers<State> = SliceCaseReducers<State>,
  Name extends string = string,
  ReducerPath extends string = Name,
  Selectors extends SliceSelectors<State> = SliceSelectors<State>,
> = Omit<
  Slice<State, Reducers, Name, ReducerPath, Selectors>,
  'selectSlice' | 'selectors' | 'getSelectors'
> & {
  /**
   * Select the slice state, using the slice's current reducerPath.
   *
   * Returns the initial state if the slice state is not found.
   */
  selectSlice(rootState: { [P in ReducerPath]?: State | undefined }): State

  /**
   * Selectors that assume the slice's state is `rootState[slice.reducerPath]` (which is usually the case)
   *
   * Equivalent to `slice.getSelectors((state: RootState) => state[slice.reducerPath])`.
   */
  get selectors(): WrappedSliceSelectors<
    State,
    { [P in ReducerPath]?: State | undefined },
    Selectors
  >

  /**
   * Get localised slice selectors (expects to be called with *just* the slice's state as the first parameter)
   */
  getSelectors(): WrappedSliceSelectors<State, State | undefined, Selectors>

  /**
   * Get globalised slice selectors (`selectState` callback is expected to receive first parameter and return slice state)
   */
  getSelectors<RootState>(
    selectState: (rootState: RootState) => State | undefined,
  ): WrappedSliceSelectors<State, RootState, Selectors>
}

/**
 * The return value of `createSlice`
 *
 * @public
 */
export interface Slice<
  State = any,
  Reducers extends SliceReducers<State> = SliceCaseReducers<State>,
  Name extends string = string,
  ReducerPath extends string = Name,
  Selectors extends SliceSelectors<State> = SliceSelectors<State>,
> {
  /**
   * The slice name.
   */
  name: Name

  /**
   * The slice reducer path.
   */
  reducerPath: ReducerPath

  /**
   * The slice's reducer.
   */
  reducer: Reducer<State> & { getInitialState(): State }

  /**
   * Action creators for the types of actions that are handled by the slice
   * reducer.
   */
  actions: CaseReducerActions<Reducers, Name>

  /**
   * The individual case reducer functions that were passed in the `reducers` parameter.
   * This enables reuse and testing if they were defined inline when calling `createSlice`.
   */
  caseReducers: SliceDefinedCaseReducers<Reducers, State>

  /**
   * Provides access to the initial state value given to the slice.
   * If a lazy state initializer was provided, it will be called and a fresh value returned.
   */
  getInitialState(): State

  /**
   * Select the slice state, using the slice's current reducerPath.
   *
   * Throws if the slice state is not found.
   */
  selectSlice(rootState: { [P in ReducerPath]: State }): State

  /**
   * Selectors that assume the slice's state is `rootState[slice.reducerPath]` (which is usually the case)
   *
   * Equivalent to `slice.getSelectors((state: RootState) => state[slice.reducerPath])`.
   */
  get selectors(): WrappedSliceSelectors<
    State,
    { [P in ReducerPath]: State },
    Selectors
  >

  /**
   * Get localised slice selectors (expects to be called with *just* the slice's state as the first parameter)
   */
  getSelectors(): WrappedSliceSelectors<State, State, Selectors>

  /**
   * Get globalised slice selectors (`selectState` callback is expected to receive first parameter and return slice state)
   */
  getSelectors<RootState>(
    selectState: (rootState: RootState) => State,
  ): WrappedSliceSelectors<State, RootState, Selectors>

  /**
   * Inject slice into provided reducer (return value from `combineSlices`), and return injected slice.
   *
   * The injected slice's selectors fall back to the initial state when the
   * slice state is missing from the root state, instead of throwing.
   */
  injectInto<NewReducerPath extends string = ReducerPath>(
    injectable: Injectable,
    config?: InjectIntoConfig<NewReducerPath>,
  ): InjectedSlice<State, Reducers, Name, NewReducerPath, Selectors>
}

interface CommonSliceOptions<
  State,
  Name extends string,
  ReducerPath extends string,
  Selectors extends SliceSelectors<State>,
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
   * A map of selectors that receive the slice's state and any additional arguments, and return a result.
   */
  selectors?: Selectors

  /**
   * Overrides the immutability adapter this `createSlice` was built with,
   * for this slice only.
   */
  immutability?: ImmutabilityAdapter

  /**
   * A callback that receives a *builder* object to define case reducers for
   * actions defined outside this slice, via calls to
   * `builder.addCase(actionCreatorOrType, reducer)`.
   *
   * The callback runs the first time the reducer is used, so slices can
   * reference each other's actions. An action type may not be handled both
   * here and in `reducers`.
   *
   * @example
   * ```ts
   * import type { Action } from '@reduxjs/toolkit';
   * import { createAction, createSlice } from '@reduxjs/toolkit';
   *
   * const incrementBy = createAction<number>('incrementBy');
   * const decrement = createAction('decrement');
   *
   * interface RejectedAction extends Action {
   *   error: Error;
   * }
   *
   * function isRejectedAction(action: Action): action is RejectedAction {
   *   return action.type.endsWith('rejected');
   * }
   *
   * createSlice({
   *   name: 'counter',
   *   initialState: 0,
   *   reducers: {},
   *   respondTo: (builder) => {
   *     builder
   *       .addCase(incrementBy, (state, action) => {
   *         // action is inferred correctly here if using TS
   *       })
   *       // You can chain calls, or have separate `builder.addCase()` lines each time
   *       .addCase(decrement, (state, action) => {})
   *       // You can match a range of action types
   *       .addMatcher(
   *         isRejectedAction,
   *         // `action` will be inferred as a RejectedAction due to isRejectedAction being defined as a type guard
   *         (state, action) => {},
   *       )
   *       // and provide a default case if no other handlers matched
   *       .addDefaultCase((state, action) => {});
   *   },
   * });
   * ```
   */
  respondTo?: (builder: ActionReducerMapBuilder<State>) => void
}

/**
 * Options for `createSlice()` with the object form of `reducers`.
 *
 * @public
 */
export interface CreateSliceObjectOptions<
  State = any,
  Name extends string = string,
  CRs extends SliceCaseReducers<State> = SliceCaseReducers<State>,
  ReducerPath extends string = Name,
  Selectors extends SliceSelectors<State> = SliceSelectors<State>,
> extends CommonSliceOptions<State, Name, ReducerPath, Selectors> {
  /**
   * A mapping from action types to action-type-specific *case reducer*
   * functions. For every action type, a matching action creator will be
   * generated using `createAction()`.
   */
  reducers: ValidateSliceCaseReducers<State, CRs>
}

/**
 * Options for `createSlice()` with the object form of `reducers`, with the
 * generic parameter order used by RTK 2.x.
 *
 * @public
 */
export type CreateSliceOptions<
  State = any,
  CR extends SliceCaseReducers<State> = SliceCaseReducers<State>,
  Name extends string = string,
  ReducerPath extends string = Name,
  Selectors extends SliceSelectors<State> = SliceSelectors<State>,
> = CreateSliceObjectOptions<State, Name, CR, ReducerPath, Selectors>

/**
 * Options for `createSlice()` with the callback form of `reducers`.
 *
 * @public
 */
export interface CreateSliceCallbackOptions<
  State,
  Name extends string,
  CustomCreators extends CreatorsMap,
  Defs extends DefinitionsShape,
  ReducerPath extends string,
  Selectors extends SliceSelectors<State>,
> extends CommonSliceOptions<State, Name, ReducerPath, Selectors> {
  /**
   * Adds custom creators to the `create` object passed to `reducers`.
   * Each creator factory is an ordinary function receiving the creator context.
   *
   * @example
   * ```ts
   * createSlice({
   *   name: 'todos',
   *   initialState,
   *   creators: (ctx) => ({ asyncThunk: asyncThunkCreator(ctx) }),
   *   reducers: (create) => ({
   *     fetchTodo: create.asyncThunk(fetchTodoById, { ... }),
   *   }),
   * })
   * ```
   */
  creators?: (ctx: CreatorContext<State, Name>) => CustomCreators

  /**
   * A callback receiving the `create` object, returning a map of reducer
   * definitions. For every definition, the matching action creator (or other
   * value) is exposed on `slice.actions`.
   */
  reducers: (create: BuiltinSliceCreators<State> & CustomCreators) => Defs
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
export type ValidateSliceCaseReducers<S, ACR extends SliceCaseReducers<S>> = {
  [T in keyof ACR]: ACR[T] extends {
    reducer(s: S, action?: infer A): any
  }
    ? {
        prepare(...a: never[]): Omit<A, 'type'>
      }
    : {}
} & ACR

/**
 * The `createSlice` function type: one call signature per form of `reducers`.
 *
 * @public
 */
export interface CreateSlice {
  <
    State,
    Name extends string,
    CRs extends SliceCaseReducers<State>,
    ReducerPath extends string = Name,
    Selectors extends SliceSelectors<State> = SliceSelectors<State>,
  >(
    options: CreateSliceObjectOptions<State, Name, CRs, ReducerPath, Selectors>,
  ): Slice<State, CRs, Name, ReducerPath, Selectors>

  <
    State,
    Name extends string,
    CustomCreators extends CreatorsMap = {},
    Defs extends DefinitionsShape = DefinitionsShape,
    ReducerPath extends string = Name,
    Selectors extends SliceSelectors<State> = SliceSelectors<State>,
  >(
    options: CreateSliceCallbackOptions<
      State,
      Name,
      CustomCreators,
      Defs,
      ReducerPath,
      Selectors
    >,
  ): Slice<State, Defs, Name, ReducerPath, Selectors>
}

/**
 * @public
 */
export interface BuildCreateSliceConfig {
  /**
   * The immutability adapter every slice from this `createSlice` uses,
   * unless overridden per slice via the `immutability` option.
   */
  immutability: ImmutabilityAdapter
}

/**
 * Builds a `createSlice` bound to an immutability adapter.
 *
 * The prebuilt `createSlice` uses the Immer adapter. Building your own with
 * another adapter lets bundlers drop Immer if nothing else uses it.
 *
 * @public
 */
export function buildCreateSlice(config: BuildCreateSliceConfig): CreateSlice {
  const { immutability: defaultAdapter } = config
  if (!defaultAdapter) {
    throw new Error(
      'buildCreateSlice requires an `immutability` adapter. Use `immerAdapter` for the default Immer behavior.',
    )
  }

  return ((options: any) =>
    createSliceImpl(options, defaultAdapter)) as CreateSlice
}

function createSliceImpl(
  options: any,
  defaultAdapter: ImmutabilityAdapter,
): any {
  const { name, reducerPath = name } = options
  const adapter: ImmutabilityAdapter = options.immutability ?? defaultAdapter

  if (!name) {
    throw new Error('`name` is a required option for createSlice')
  }
  if (process.env.NODE_ENV !== 'production') {
    if ('extraReducers' in options) {
      throw new Error(
        `[slice ${name}] The \`extraReducers\` option was renamed to \`respondTo\` in RTK 3.0 and only accepts the builder callback form. See the migration guide.`,
      )
    }
    if (
      options.respondTo !== undefined &&
      typeof options.respondTo !== 'function'
    ) {
      throw new Error(
        `[slice ${name}] \`respondTo\` must be a builder callback function`,
      )
    }
    if ('creators' in options && typeof options.reducers !== 'function') {
      throw new Error(
        `[slice ${name}] the \`creators\` option requires the callback form of \`reducers\``,
      )
    }
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

  const getInitialState =
    typeof options.initialState === 'function'
      ? (options.initialState as () => unknown)
      : () => options.initialState

  const sliceCases: Record<string, CaseReducer<any, any>> = {}
  const caseTypes = new Set<string>()
  const sliceMatchers: ActionMatcherDescriptionCollection<any> = []
  const actions: Record<string, unknown> = {}
  const caseReducers: Record<string, unknown> = {}

  function makeHandlingContext(
    details: ReducerDetails,
  ): ReducerHandlingContext<any> {
    const context: ReducerHandlingContext<any> = {
      addCase(typeOrActionCreator, reducer) {
        const type =
          typeof typeOrActionCreator === 'string'
            ? typeOrActionCreator
            : typeOrActionCreator.type
        if (!type) {
          throw new Error(
            `[slice ${name}] \`addCase\` requires a non-empty action type`,
          )
        }
        if (caseTypes.has(type)) {
          throw new Error(
            `[slice ${name}] action type "${type}" already has a case reducer`,
          )
        }
        caseTypes.add(type)
        sliceCases[type] = reducer
        return context
      },
      addMatcher(matcher, reducer) {
        sliceMatchers.push({ matcher, reducer })
        return context
      },
      exposeAction(actionCreator) {
        actions[details.reducerName] = actionCreator
        return context
      },
      exposeCaseReducer(caseReducer) {
        caseReducers[details.reducerName] = caseReducer
        return context
      },
      getInitialState,
    }
    return context
  }

  const builtinCreators = buildBuiltinCreators<any>()
  const definitions: Record<string, any> =
    typeof options.reducers === 'function'
      ? options.reducers({
          ...builtinCreators,
          ...(options.creators
            ? options.creators({ name, $types: null })
            : undefined),
        })
      : (options.reducers ?? {})

  for (const [reducerName, definition] of Object.entries(definitions)) {
    const details: ReducerDetails = {
      sliceName: name,
      reducerName,
      type: `${name}/${reducerName}`,
    }
    let reducerDefinition: ReducerDefinition
    if (isReducerDefinition(definition)) {
      reducerDefinition = definition
    } else if (typeof definition === 'function') {
      reducerDefinition = builtinCreators.reducer(definition)
    } else if (
      definition &&
      typeof definition.reducer === 'function' &&
      typeof definition.prepare === 'function'
    ) {
      reducerDefinition = builtinCreators.preparedReducer(
        definition.prepare,
        definition.reducer,
      )
    } else {
      throw new Error(
        `[slice ${name}] invalid reducer definition for "${reducerName}": expected a case reducer function, a { reducer, prepare } object, or a creator definition`,
      )
    }
    reducerDefinition.handle(details, makeHandlingContext(details))
  }

  // The reducer is built on first use so that `respondTo` callbacks can
  // reference actions of slices created later.
  let _reducer: ReducerWithInitialState<any> | undefined

  function buildReducer() {
    const [extraCases, extraMatchers, defaultCaseReducer] = options.respondTo
      ? executeReducerBuilderCallback<any>(options.respondTo)
      : [{}, [], undefined]

    for (const type of Object.keys(extraCases)) {
      if (caseTypes.has(type)) {
        throw new Error(
          `[slice ${name}] action type "${type}" is handled by both \`reducers\` and \`respondTo\`. Each action type must be handled in exactly one place.`,
        )
      }
    }

    return createReducerFromCases(
      options.initialState,
      { ...sliceCases, ...extraCases },
      [...sliceMatchers, ...extraMatchers],
      defaultCaseReducer,
      adapter,
    )
  }

  function ensureReducer() {
    if (!_reducer) {
      _reducer = buildReducer()
    }
    return _reducer
  }

  const reducer = Object.assign(
    function reducer(state: unknown, action: UnknownAction) {
      return ensureReducer()(state, action)
    },
    {
      getInitialState: () => ensureReducer().getInitialState(),
    },
  )

  const selectSelf = (state: unknown) => state

  // Fallback state per selectState function, so repeated selector calls
  // before injection return the same object.
  const injectedStateCache = new WeakMap<(rootState: any) => unknown, unknown>()

  // Wrapped selectors per selectState function, shared by every injected
  // copy of the slice that uses the same selectState.
  const plainSelectorCache = new WeakMap<
    (rootState: any) => unknown,
    Record<string, unknown>
  >()
  const injectedSelectorCache = new WeakMap<
    (rootState: any) => unknown,
    Record<string, unknown>
  >()

  function makeSelectorProps(currentReducerPath: string, injected = false) {
    function selectSlice(rootState: Record<string, unknown>) {
      let sliceState = rootState[currentReducerPath]
      if (typeof sliceState === 'undefined') {
        if (injected) {
          sliceState = getOrInsertComputed(
            injectedStateCache,
            selectSlice,
            () => reducer.getInitialState(),
          )
        } else {
          throw new Error(
            `[slice ${name}] selectSlice: root state does not contain a "${currentReducerPath}" key. Is the slice reducer included in the store?`,
          )
        }
      }
      return sliceState
    }

    function wrapSelector(
      selector: (sliceState: any, ...args: any[]) => unknown,
      selectState: (rootState: any) => unknown,
    ) {
      return Object.assign(
        (rootState: unknown, ...args: unknown[]) => {
          let sliceState = selectState(rootState)
          if (typeof sliceState === 'undefined') {
            if (injected) {
              sliceState = getOrInsertComputed(
                injectedStateCache,
                selectState,
                () => reducer.getInitialState(),
              )
            } else {
              throw new Error(
                `[slice ${name}] selector: selectState returned undefined for an uninjected slice. Is the slice reducer included in the store?`,
              )
            }
          }
          return selector(sliceState, ...args)
        },
        { unwrapped: selector },
      )
    }

    const selectorCache = injected ? injectedSelectorCache : plainSelectorCache

    function getSelectors(
      selectState: (rootState: any) => unknown = selectSelf,
    ) {
      return getOrInsertComputed(selectorCache, selectState, () => {
        const wrapped: Record<string, unknown> = {}
        for (const [key, selector] of Object.entries(
          (options.selectors ?? {}) as SliceSelectors<any>,
        )) {
          wrapped[key] = wrapSelector(selector, selectState)
        }
        return wrapped
      })
    }

    return {
      reducerPath: currentReducerPath,
      selectSlice,
      getSelectors,
      get selectors() {
        return getSelectors(selectSlice)
      },
    }
  }

  const slice = {
    name,
    reducer,
    actions,
    caseReducers,
    getInitialState: reducer.getInitialState,
    ...makeSelectorProps(reducerPath),
    injectInto(
      injectable: Injectable,
      { reducerPath: pathOpt, ...config }: InjectIntoConfig<string> = {},
    ) {
      const newReducerPath = pathOpt ?? reducerPath
      injectable.inject({ reducerPath: newReducerPath, reducer }, config)
      return {
        ...slice,
        ...makeSelectorProps(newReducerPath, true),
      }
    },
  }
  return slice
}

/**
 * A function that accepts an initial state, an object full of reducer
 * functions, and a "slice name", and automatically generates
 * action creators and action types that correspond to the
 * reducers and state.
 *
 * Uses Immer for immutable updates. Use `buildCreateSlice` to pick a
 * different immutability adapter.
 *
 * @public
 */
export const createSlice: CreateSlice = /* @__PURE__ */ buildCreateSlice({
  immutability: immerAdapter,
})
