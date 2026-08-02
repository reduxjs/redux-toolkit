import type { Reducer, UnknownAction } from 'redux'
import type {
  PayloadAction,
  PayloadActionCreator,
  PrepareAction,
  _ActionCreatorWithPreparedPayload,
} from '../createAction'
import { createAction } from '../createAction'
import type { CaseReducer, ReducerWithInitialState } from '../createReducer'
import { createReducer } from '../createReducer'
import type { ActionReducerMapBuilder } from '../mapBuilders'
import { executeReducerBuilderCallback } from '../mapBuilders'
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

/**
 * RTK 3.0 createSlice prototype.
 *
 * Differences from 2.x, per the revamp directions doc:
 * - `extraReducers` is renamed to `respondTo` (builder callback only).
 *   Passing `extraReducers` throws unconditionally with migration guidance.
 * - No `buildCreateSlice` / `asyncThunkCreator` symbol gate. The callback
 *   form takes a `creators` callback; custom creators (including the async
 *   thunk creator) are ordinary imports bound via the creator context.
 * - Everything that only reads options validates eagerly at `createSlice()`
 *   call time, in both dev and prod. Only reducer construction stays lazy,
 *   which preserves circular `respondTo` action references.
 * - An action type handled by both `reducers` and `respondTo` is an error
 *   (2.x silently preferred the slice reducer).
 * - `slice.reducer.getInitialState` works (permanently `undefined` in 2.x).
 * - `slice.caseReducers` holds the user's exact functions in every
 *   declaration form (2.x wrapped them in the callback form).
 * - `selectSlice` / wrapped selectors throw on missing state in prod too
 *   (2.x returned `undefined` in prod).
 *
 * Deliberately out of scope for this spike: immutability adapters (Immer is
 * used directly via createReducer), `injectInto`/`combineSlices` integration,
 * selector memoization, `asyncThunk.withTypes`.
 */

export type SliceCaseReducers<State> = Record<
  string,
  | CaseReducer<State, PayloadAction<any>>
  | CaseReducerWithPrepare<State, PayloadAction<any, string, any, any>>
>

export interface CaseReducerWithPrepare<
  State,
  Action extends PayloadAction<any, string, any, any>,
> {
  reducer: CaseReducer<State, Action>
  prepare: PrepareAction<Action['payload']>
}

export type DefinitionsShape = Record<string, ReducerDefinition<AnyExposure>>

export type CreatorsMap = Record<
  string,
  (...args: any[]) => ReducerDefinition<AnyExposure>
>

export type SliceSelectors<State> = Record<
  string,
  (sliceState: State, ...args: any[]) => any
>

/**
 * `slice.actions` for the object form.
 * Payload comes from the case reducer's action parameter annotation.
 */
export type ObjectSliceActions<
  Name extends string,
  CRs extends SliceCaseReducers<any>,
> = {
  [K in keyof CRs & string]: CRs[K] extends {
    prepare: infer PA extends PrepareAction<any>
  }
    ? _ActionCreatorWithPreparedPayload<PA, `${Name}/${K}`>
    : CRs[K] extends (state: any, action: infer A) => any
      ? A extends { payload: infer P }
        ? PayloadActionCreator<P, `${Name}/${K}`>
        : PayloadActionCreator<void, `${Name}/${K}`>
      : PayloadActionCreator<void, `${Name}/${K}`>
}

/**
 * `slice.caseReducers` for the object form: the user's own functions.
 */
export type ObjectSliceCaseReducers<CRs extends SliceCaseReducers<any>> = {
  [K in keyof CRs]: CRs[K] extends { reducer: infer R } ? R : CRs[K]
}

/**
 * `slice.actions` for the callback form, derived from each definition's
 * phantom exposure.
 */
export type DefinitionSliceActions<
  Name extends string,
  Defs extends DefinitionsShape,
> = {
  [K in keyof Defs & string]: Defs[K] extends ReducerDefinition<infer E>
    ? E extends SliceActionExposure<infer P>
      ? PayloadActionCreator<P, `${Name}/${K}`>
      : E extends PreparedActionExposure<infer PA>
        ? _ActionCreatorWithPreparedPayload<PA, `${Name}/${K}`>
        : E extends ValueExposure<infer V, any>
          ? V
          : never
    : never
}

/**
 * `slice.caseReducers` for the callback form.
 */
export type DefinitionSliceCaseReducers<
  State,
  Defs extends DefinitionsShape,
> = {
  [K in keyof Defs]: Defs[K] extends ReducerDefinition<infer E>
    ? E extends SliceActionExposure<infer P>
      ? CaseReducer<State, PayloadAction<P>>
      : E extends PreparedActionExposure<infer PA>
        ? CaseReducer<State, ReturnType<_ActionCreatorWithPreparedPayload<PA, string>>>
        : E extends ValueExposure<any, infer CRs>
          ? CRs
          : never
    : never
}

export type WrappedSliceSelectors<
  State,
  ReducerPath extends string,
  Selectors extends SliceSelectors<State>,
> = {
  [K in keyof Selectors]: Selectors[K] extends (
    sliceState: State,
    ...args: infer Args
  ) => infer Result
    ? ((
        rootState: { [P in ReducerPath]: State },
        ...args: Args
      ) => Result) & { unwrapped: Selectors[K] }
    : never
}

export interface Slice<
  State,
  Name extends string,
  Actions,
  CaseReducersOut,
  ReducerPath extends string = Name,
  Selectors extends SliceSelectors<State> = {},
> {
  name: Name
  reducerPath: ReducerPath
  reducer: Reducer<State> & { getInitialState(): State }
  actions: Actions
  caseReducers: CaseReducersOut
  getInitialState(): State
  selectSlice(rootState: { [P in ReducerPath]: State }): State
  selectors: WrappedSliceSelectors<State, ReducerPath, Selectors>
  getSelectors(): {
    [K in keyof Selectors]: Selectors[K]
  }
  getSelectors<RootState>(
    selectState: (rootState: RootState) => State,
  ): {
    [K in keyof Selectors]: Selectors[K] extends (
      sliceState: State,
      ...args: infer Args
    ) => infer Result
      ? ((rootState: RootState, ...args: Args) => Result) & {
          unwrapped: Selectors[K]
        }
      : never
  }
}

interface CommonSliceOptions<
  State,
  Name extends string,
  ReducerPath extends string,
  Selectors extends SliceSelectors<State>,
> {
  name: Name
  initialState: State | (() => State)
  reducerPath?: ReducerPath
  selectors?: Selectors
  /**
   * Registers case reducers for actions defined outside this slice
   * (other slices' actions, thunk lifecycle actions, matchers).
   *
   * Renamed from 2.x `extraReducers`. Builder callback only. Runs lazily at
   * first reducer call, so circular references between slices' actions work.
   */
  respondTo?: (builder: ActionReducerMapBuilder<State>) => void
}

export interface CreateSliceObjectOptions<
  State,
  Name extends string,
  CRs extends SliceCaseReducers<State>,
  ReducerPath extends string,
  Selectors extends SliceSelectors<State>,
> extends CommonSliceOptions<State, Name, ReducerPath, Selectors> {
  reducers: CRs
}

export interface CreateSliceCallbackOptions<
  State,
  Name extends string,
  CustomCreators extends CreatorsMap,
  Defs extends DefinitionsShape,
  ReducerPath extends string,
  Selectors extends SliceSelectors<State>,
> extends CommonSliceOptions<State, Name, ReducerPath, Selectors> {
  /**
   * Binds custom creators for this slice. Each creator factory is an
   * ordinary generic function receiving the creator context.
   */
  creators?: (ctx: CreatorContext<State, Name>) => CustomCreators
  reducers: (create: BuiltinSliceCreators<State> & CustomCreators) => Defs
}

export function createSlice<
  State,
  Name extends string,
  CRs extends SliceCaseReducers<State>,
  ReducerPath extends string = Name,
  Selectors extends SliceSelectors<State> = SliceSelectors<State>,
>(
  options: CreateSliceObjectOptions<State, Name, CRs, ReducerPath, Selectors>,
): Slice<
  State,
  Name,
  ObjectSliceActions<Name, CRs>,
  ObjectSliceCaseReducers<CRs>,
  ReducerPath,
  Selectors
>

export function createSlice<
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
): Slice<
  State,
  Name,
  DefinitionSliceActions<Name, Defs>,
  DefinitionSliceCaseReducers<State, Defs>,
  ReducerPath,
  Selectors
>

export function createSlice(options: any): any {
  const { name, reducerPath = name } = options

  // Eager validation: everything below reads only `options` and runs
  // unconditionally, in development and production alike.
  if (!name) {
    throw new Error('`name` is a required option for createSlice')
  }
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

  const getInitialState =
    typeof options.initialState === 'function'
      ? (options.initialState as () => unknown)
      : () => options.initialState

  const typedCases: Array<{ type: string; reducer: CaseReducer<any, any> }> =
    []
  const caseTypes = new Set<string>()
  const sliceMatchers: Array<{
    matcher: (action: unknown) => boolean
    reducer: CaseReducer<any, any>
  }> = []
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
        typedCases.push({ type, reducer })
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

  // Definitions are processed eagerly: `slice.actions` exists synchronously.
  const definitions: Record<string, unknown> =
    typeof options.reducers === 'function'
      ? options.reducers({
          ...buildBuiltinCreators(),
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
    const context = makeHandlingContext(details)
    if (isReducerDefinition(definition)) {
      definition.handle(details, context)
    } else if (typeof definition === 'function') {
      context
        .addCase(details.type, definition as CaseReducer<any, any>)
        .exposeAction(createAction(details.type))
        .exposeCaseReducer(definition)
    } else if (
      definition &&
      typeof (definition as any).reducer === 'function' &&
      typeof (definition as any).prepare === 'function'
    ) {
      const { reducer, prepare } = definition as {
        reducer: CaseReducer<any, any>
        prepare: PrepareAction<any>
      }
      context
        .addCase(details.type, reducer)
        .exposeAction(createAction(details.type, prepare))
        .exposeCaseReducer(reducer)
    } else {
      throw new Error(
        `[slice ${name}] invalid reducer definition for "${reducerName}": expected a case reducer function, a { reducer, prepare } object, or a creator definition`,
      )
    }
  }

  // Only the reducer build is lazy, and only so that `respondTo` callbacks
  // can reference other slices' actions circularly.
  let _reducer: ReducerWithInitialState<any> | undefined

  function buildReducer() {
    const [extraCases, extraMatchers, defaultCaseReducer] = options.respondTo
      ? executeReducerBuilderCallback(options.respondTo)
      : [{}, [], undefined]

    for (const type of Object.keys(extraCases)) {
      if (caseTypes.has(type)) {
        throw new Error(
          `[slice ${name}] action type "${type}" is handled by both \`reducers\` and \`respondTo\`. RTK 2.x silently preferred the slice reducer here; RTK 3.0 requires handling each action in exactly one place.`,
        )
      }
    }

    return createReducer(options.initialState, (builder) => {
      for (const { type, reducer } of typedCases) {
        builder.addCase(type, reducer)
      }
      for (const [type, reducer] of Object.entries(extraCases)) {
        builder.addCase(type, reducer as CaseReducer<any, any>)
      }
      for (const { matcher, reducer } of sliceMatchers) {
        builder.addMatcher(matcher as any, reducer)
      }
      for (const { matcher, reducer } of extraMatchers) {
        builder.addMatcher(matcher as any, reducer)
      }
      if (defaultCaseReducer) {
        builder.addDefaultCase(defaultCaseReducer)
      }
    })
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

  function selectSlice(rootState: Record<string, unknown>) {
    const sliceState = rootState[reducerPath]
    if (typeof sliceState === 'undefined') {
      throw new Error(
        `[slice ${name}] selectSlice: root state does not contain a "${reducerPath}" key. Is the slice reducer included in the store?`,
      )
    }
    return sliceState
  }

  function getSelectors(
    selectState: (rootState: any) => unknown = selectSlice,
  ) {
    const wrapped: Record<string, unknown> = {}
    for (const [key, selector] of Object.entries(
      (options.selectors ?? {}) as SliceSelectors<any>,
    )) {
      wrapped[key] = Object.assign(
        (rootState: unknown, ...args: unknown[]) =>
          selector(selectState(rootState), ...args),
        { unwrapped: selector },
      )
    }
    return wrapped
  }

  let _selectors: Record<string, unknown> | undefined

  return {
    name,
    reducerPath,
    reducer,
    actions,
    caseReducers,
    getInitialState: () => ensureReducer().getInitialState(),
    selectSlice,
    getSelectors,
    get selectors() {
      if (!_selectors) {
        _selectors = getSelectors()
      }
      return _selectors
    },
  }
}

/**
 * Type-only helper for tests: extracts the action type union a slice handles.
 */
export type SliceActionCreators<S> =
  S extends Slice<any, any, infer A, any, any, any> ? A : never
