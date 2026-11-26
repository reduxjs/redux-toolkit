import type { Draft } from './draftTypes'
import type { Action, Reducer, UnknownAction } from 'redux'
import type { ImmutabilityAdapter } from './immutability'
import { immerAdapter } from './immutability'
import type { ActionReducerMapBuilder } from './mapBuilders'
import { executeReducerBuilderCallback } from './mapBuilders'
import type { TypeGuard } from './tsHelpers'

/**
 * Defines a mapping from action types to corresponding action object shapes.
 *
 * @deprecated This should not be used manually - it is only used for internal
 *             inference purposes and should not have any further value.
 *             It might be removed in the future.
 * @public
 */
export type Actions<T extends keyof any = string> = Record<T, Action>

export type ActionMatcherDescription<S, A extends Action> = {
  matcher: TypeGuard<A>
  reducer: CaseReducer<S, NoInfer<A>>
}

export type ReadonlyActionMatcherDescriptionCollection<S> = ReadonlyArray<
  ActionMatcherDescription<S, any>
>

export type ActionMatcherDescriptionCollection<S> = Array<
  ActionMatcherDescription<S, any>
>

/**
 * A *case reducer* is a reducer function for a specific action type. Case
 * reducers can be composed to full reducers using `createReducer()`.
 *
 * Unlike a normal Redux reducer, a case reducer is never called with an
 * `undefined` state to determine the initial state. Instead, the initial
 * state is explicitly specified as an argument to `createReducer()`.
 *
 * In addition, a case reducer can choose to mutate the passed-in `state`
 * value directly instead of returning a new state. This does not actually
 * cause the store state to be mutated directly; instead, thanks to
 * [immer](https://github.com/mweststrate/immer), the mutations are
 * translated to copy operations that result in a new state.
 *
 * @public
 */
export type CaseReducer<S = any, A extends Action = UnknownAction> = (
  state: Draft<S>,
  action: A,
) => NoInfer<S> | void | Draft<NoInfer<S>>

/**
 * A mapping from action types to case reducers for `createReducer()`.
 *
 * @deprecated This should not be used manually - it is only used
 *             for internal inference purposes and using it manually
 *             would lead to type erasure.
 *             It might be removed in the future.
 * @public
 */
export type CaseReducers<S, AS extends Actions> = {
  [T in keyof AS]: AS[T] extends Action ? CaseReducer<S, AS[T]> : void
}

export type NotFunction<T> = T extends Function ? never : T

function isStateFunction<S>(x: unknown): x is () => S {
  return typeof x === 'function'
}

export type ReducerWithInitialState<S extends NotFunction<any>> = Reducer<S> & {
  getInitialState: () => S
}

/**
 * The shape of `createReducer`. The immutability adapter is bound by
 * `buildCreateReducer`; the optional third argument overrides it for one
 * reducer.
 *
 * @public
 */
export type CreateReducer = <S extends NotFunction<any>>(
  initialState: S | (() => S),
  builderCallback: (builder: ActionReducerMapBuilder<S>) => void,
  immutability?: ImmutabilityAdapter,
) => ReducerWithInitialState<S>

/**
 * @public
 */
export interface BuildCreateReducerConfig {
  immutability: ImmutabilityAdapter
}

/**
 * Builds a `createReducer` bound to a default immutability adapter.
 * The exported `createReducer` is `buildCreateReducer({ immutability: immerAdapter })`.
 *
 * @public
 */
export function buildCreateReducer({
  immutability: defaultAdapter,
}: BuildCreateReducerConfig): CreateReducer {
  if (!defaultAdapter) {
    throw new Error(
      'buildCreateReducer requires an `immutability` adapter. Use `immerAdapter` for the default Immer behavior.',
    )
  }
  return (initialState, builderCallback, immutability) =>
    createReducerImpl(
      initialState,
      builderCallback,
      immutability ?? defaultAdapter,
    )
}

export function createReducerImpl<S extends NotFunction<any>>(
  initialState: S | (() => S),
  builderCallback: (builder: ActionReducerMapBuilder<S>) => void,
  adapter: ImmutabilityAdapter,
): ReducerWithInitialState<S> {
  if (typeof builderCallback === 'object') {
    throw new Error(
      "The object notation for `createReducer` has been removed. Please use the 'builder callback' notation instead: https://redux-toolkit.js.org/api/createReducer",
    )
  }
  if (typeof builderCallback !== 'function') {
    throw new Error(
      'createReducer requires a builder callback as its second argument',
    )
  }

  return createReducerFromCases(
    initialState,
    ...executeReducerBuilderCallback(builderCallback),
    adapter,
  )
}

export function createReducerFromCases<S extends NotFunction<any>>(
  initialState: S | (() => S),
  actionsMap: CaseReducers<S, any>,
  finalActionMatchers: ReadonlyActionMatcherDescriptionCollection<S>,
  finalDefaultCaseReducer: CaseReducer<S, any> | undefined,
  adapter: ImmutabilityAdapter,
): ReducerWithInitialState<S> {
  // Ensure the initial state gets frozen either way (if draftable)
  let getInitialState: () => S
  if (isStateFunction(initialState)) {
    getInitialState = () => adapter.freezeDraftable(initialState())
  } else {
    const frozenInitialState = adapter.freezeDraftable(initialState)
    getInitialState = () => frozenInitialState
  }

  function applyCaseReducer(
    previousState: S,
    caseReducer: CaseReducer<S, any>,
    action: any,
  ): S {
    if (adapter.isDraft(previousState)) {
      // If it's already a draft, we must already be inside a `produce` call,
      // likely because this is being wrapped in `createReducer`, `createSlice`, or nested
      // inside an existing draft. It's safe to just pass the draft to the mutator.
      const draft = previousState as Draft<S> // We can assume this is already a draft
      const result = caseReducer(draft, action)

      if (result === undefined) {
        return previousState
      }

      return result as S
    } else if (!adapter.isDraftable(previousState)) {
      // If state is not draftable (ex: a primitive such as 0, or any value with
      // an adapter that does not draft), call the case reducer directly.
      // It must return the next state.
      const result = caseReducer(previousState as any, action)

      if (result === undefined) {
        if (previousState === null) {
          return previousState
        }
        throw new Error(
          'A case reducer on a non-draftable value must not return undefined',
        )
      }

      return result as S
    } else {
      return adapter.produce(previousState, (draft) =>
        caseReducer(draft, action),
      )
    }
  }

  function reducer(state = getInitialState(), action: any): S {
    const caseReducer = actionsMap[action.type]
    // All matchers run before any case reducer, so only collect matching
    // reducers into an array when there is at least one.
    let matchedReducers: CaseReducer<S, any>[] | undefined
    for (const { matcher, reducer } of finalActionMatchers) {
      if (matcher(action) && reducer) {
        ;(matchedReducers ??= []).push(reducer)
      }
    }

    if (!caseReducer && !matchedReducers) {
      return finalDefaultCaseReducer
        ? applyCaseReducer(state, finalDefaultCaseReducer, action)
        : state
    }

    if (caseReducer) {
      state = applyCaseReducer(state, caseReducer, action)
    }
    if (matchedReducers) {
      for (const matchedReducer of matchedReducers) {
        state = applyCaseReducer(state, matchedReducer, action)
      }
    }
    return state
  }

  reducer.getInitialState = getInitialState

  return reducer as ReducerWithInitialState<S>
}

/**
 * A utility function that allows defining a reducer as a mapping from action
 * type to *case reducer* functions that handle these action types. The
 * reducer's initial state is passed as the first argument.
 *
 * @remarks
 * The body of every case reducer is implicitly wrapped with a call to
 * `produce()` from the [immer](https://github.com/mweststrate/immer) library.
 * This means that rather than returning a new state object, you can also
 * mutate the passed-in state object directly; these mutations will then be
 * automatically and efficiently translated into copies, giving you both
 * convenience and immutability.
 *
 * @overloadSummary
 * This function accepts a callback that receives a `builder` object as its argument.
 * That builder provides `addCase`, `addMatcher` and `addDefaultCase` functions that may be
 * called to define what actions this reducer will handle.
 *
 * @param initialState - `State | (() => State)`: The initial state that should be used when the reducer is called the first time. This may also be a "lazy initializer" function, which should return an initial state value when called. This will be used whenever the reducer is called with `undefined` as its state value, and is primarily useful for cases like reading initial state from `localStorage`.
 * @param builderCallback - `(builder: Builder) => void` A callback that receives a *builder* object to define
 *   case reducers via calls to `builder.addCase(actionCreatorOrType, reducer)`.
 * @param immutability - `ImmutabilityAdapter` (optional): overrides the immutable-update library for this reducer. Defaults to Immer.
 * @example
 * ```ts
 * import type { PayloadAction, UnknownAction } from '@reduxjs/toolkit';
 * import { createAction, createReducer } from '@reduxjs/toolkit';
 *
 * const increment = createAction<number>('increment');
 * const decrement = createAction<number>('decrement');
 *
 * function isActionWithNumberPayload(
 *   action: UnknownAction,
 * ): action is PayloadAction<number> {
 *   return typeof action.payload === 'number';
 * }
 *
 * const reducer = createReducer(
 *   {
 *     counter: 0,
 *     sumOfNumberPayloads: 0,
 *     unhandledActions: 0,
 *   },
 *   (builder) => {
 *     builder
 *       .addCase(increment, (state, action) => {
 *         // action is inferred correctly here
 *         state.counter += action.payload;
 *       })
 *       // You can chain calls, or have separate `builder.addCase()` lines each time
 *       .addCase(decrement, (state, action) => {
 *         state.counter -= action.payload;
 *       })
 *       // You can apply a "matcher function" to incoming actions
 *       .addMatcher(isActionWithNumberPayload, (state, action) => {})
 *       // and provide a default case if no other handlers matched
 *       .addDefaultCase((state, action) => {});
 *   },
 * );
 * ```
 * @public
 */
export const createReducer: CreateReducer = /* @__PURE__ */ buildCreateReducer({
  immutability: immerAdapter,
})
