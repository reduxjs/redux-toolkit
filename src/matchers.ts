import {
  ActionFromMatcher,
  hasMatchFunction,
  Matcher,
  UnionToIntersection
} from './tsHelpers'
import {
  AsyncThunk,
  AsyncThunkFulfilledActionCreator,
  AsyncThunkPendingActionCreator,
  AsyncThunkRejectedActionCreator
} from './createAsyncThunk'

/** @public */
export type ActionMatchingAnyOf<
  Matchers extends [Matcher<any>, ...Matcher<any>[]]
> = ActionFromMatcher<Matchers[number]>

/** @public */
export type ActionMatchingAllOf<
  Matchers extends [Matcher<any>, ...Matcher<any>[]]
> = UnionToIntersection<ActionMatchingAnyOf<Matchers>>

const matches = (matcher: Matcher<any>, action: any) => {
  if (hasMatchFunction(matcher)) {
    return matcher.match(action)
  } else {
    return matcher(action)
  }
}

/**
 * A higher-order function that returns a function that may be used to check
 * whether an action matches any one of the supplied type guards or action
 * creators.
 *
 * @param matchers The type guards or action creators to match against.
 *
 * @public
 */
export function isAnyOf<Matchers extends [Matcher<any>, ...Matcher<any>[]]>(
  ...matchers: Matchers
) {
  return (action: any): action is ActionMatchingAnyOf<Matchers> => {
    return matchers.some(matcher => matches(matcher, action))
  }
}

/**
 * A higher-order function that returns a function that may be used to check
 * whether an action matches all of the supplied type guards or action
 * creators.
 *
 * @param matchers The type guards or action creators to match against.
 *
 * @public
 */
export function isAllOf<Matchers extends [Matcher<any>, ...Matcher<any>[]]>(
  ...matchers: Matchers
) {
  return (action: any): action is ActionMatchingAllOf<Matchers> => {
    return matchers.every(matcher => matches(matcher, action))
  }
}

/**
 * @param action A redux action
 * @param validStatus An array of valid meta.requestStatus values
 *
 * @internal
 */
export function hasExpectedRequestMetadata(action: any, validStatus: string[]) {
  if (!action || !action.meta) return false

  const hasValidRequestId = typeof action.meta.requestId === 'string'
  const hasValidRequestStatus =
    validStatus.indexOf(action.meta.requestStatus) > -1

  return hasValidRequestId && hasValidRequestStatus
}

export type UnknownAsyncThunkPendingAction = ReturnType<
  AsyncThunkPendingActionCreator<unknown>
>

export type PendingActionFromAsyncThunk<
  T extends AnyAsyncThunk
> = ActionFromMatcher<T['pending']>

/**
 * A higher-order function that returns a function that may be used to check
 * whether an action belongs to one of the provided async thunk action creators,
 * and that the action is pending.
 *
 * @param asyncThunks (optional) The async thunk action creators to match against.
 *
 * @public
 */
export function isPending(): (
  action: any
) => action is UnknownAsyncThunkPendingAction
export function isPending<
  AsyncThunks extends [AnyAsyncThunk, ...AnyAsyncThunk[]]
>(
  ...asyncThunks: AsyncThunks
): (action: any) => action is PendingActionFromAsyncThunk<AsyncThunks[number]>
export function isPending<
  AsyncThunks extends [AnyAsyncThunk, ...AnyAsyncThunk[]]
>(...asyncThunks: AsyncThunks) {
  if (asyncThunks.length === 0) {
    return (action: any) => hasExpectedRequestMetadata(action, ['pending'])
  }

  return (
    action: any
  ): action is PendingActionFromAsyncThunk<AsyncThunks[number]> => {
    // note: this type will be correct because we have at least 1 asyncThunk
    const matchers: [Matcher<any>, ...Matcher<any>[]] = asyncThunks.map(
      asyncThunk => asyncThunk.pending
    ) as any

    const combinedMatcher = isAnyOf(...matchers)

    return combinedMatcher(action)
  }
}

export type UnknownAsyncThunkRejectedAction = ReturnType<
  AsyncThunkRejectedActionCreator<unknown, unknown>
>

export type RejectedActionFromAsyncThunk<
  T extends AnyAsyncThunk
> = ActionFromMatcher<T['rejected']>

/**
 * A higher-order function that returns a function that may be used to check
 * whether an action belongs to one of the provided async thunk action creators,
 * and that the action is rejected.
 *
 * @param asyncThunks (optional) The async thunk action creators to match against.
 *
 * @public
 */
export function isRejected(): (
  action: any
) => action is UnknownAsyncThunkRejectedAction
export function isRejected<
  AsyncThunks extends [AnyAsyncThunk, ...AnyAsyncThunk[]]
>(
  ...asyncThunks: AsyncThunks
): (action: any) => action is RejectedActionFromAsyncThunk<AsyncThunks[number]>
export function isRejected<
  AsyncThunks extends [AnyAsyncThunk, ...AnyAsyncThunk[]]
>(...asyncThunks: AsyncThunks) {
  if (asyncThunks.length === 0) {
    return (action: any) => hasExpectedRequestMetadata(action, ['rejected'])
  }

  return (
    action: any
  ): action is RejectedActionFromAsyncThunk<AsyncThunks[number]> => {
    // note: this type will be correct because we have at least 1 asyncThunk
    const matchers: [Matcher<any>, ...Matcher<any>[]] = asyncThunks.map(
      asyncThunk => asyncThunk.rejected
    ) as any

    const combinedMatcher = isAnyOf(...matchers)

    return combinedMatcher(action)
  }
}

export type UnknownAsyncThunkFulfilledAction = ReturnType<
  AsyncThunkFulfilledActionCreator<unknown, unknown>
>

export type FulfilledActionFromAsyncThunk<
  T extends AnyAsyncThunk
> = ActionFromMatcher<T['fulfilled']>

/**
 * A higher-order function that returns a function that may be used to check
 * whether an action belongs to one of the provided async thunk action creators,
 * and that the action is fulfilled.
 *
 * @param asyncThunks (optional) The async thunk action creators to match against.
 *
 * @public
 */
export function isFulfilled(): (
  action: any
) => action is UnknownAsyncThunkFulfilledAction
export function isFulfilled<
  AsyncThunks extends [AnyAsyncThunk, ...AnyAsyncThunk[]]
>(
  ...asyncThunks: AsyncThunks
): (action: any) => action is FulfilledActionFromAsyncThunk<AsyncThunks[number]>
export function isFulfilled<
  AsyncThunks extends [AnyAsyncThunk, ...AnyAsyncThunk[]]
>(...asyncThunks: AsyncThunks) {
  if (asyncThunks.length === 0) {
    return (action: any) => hasExpectedRequestMetadata(action, ['fulfilled'])
  }

  return (
    action: any
  ): action is FulfilledActionFromAsyncThunk<AsyncThunks[number]> => {
    // note: this type will be correct because we have at least 1 asyncThunk
    const matchers: [Matcher<any>, ...Matcher<any>[]] = asyncThunks.map(
      asyncThunk => asyncThunk.fulfilled
    ) as any

    const combinedMatcher = isAnyOf(...matchers)

    return combinedMatcher(action)
  }
}

export type UnknownAsyncThunkAction =
  | UnknownAsyncThunkPendingAction
  | UnknownAsyncThunkRejectedAction
  | UnknownAsyncThunkFulfilledAction

export type AnyAsyncThunk = AsyncThunk<any, any, any>

export type ActionsFromAsyncThunk<T extends AnyAsyncThunk> =
  | ActionFromMatcher<T['pending']>
  | ActionFromMatcher<T['fulfilled']>
  | ActionFromMatcher<T['rejected']>

/**
 * A higher-order function that returns a function that may be used to check
 * whether an action belongs to one of the provided async thunk action creators.
 *
 * @param asyncThunks (optional) The async thunk action creators to match against.
 *
 * @public
 */
export function isAsyncThunkAction(): (
  action: any
) => action is UnknownAsyncThunkAction
export function isAsyncThunkAction<
  AsyncThunks extends [AnyAsyncThunk, ...AnyAsyncThunk[]]
>(
  ...asyncThunks: AsyncThunks
): (action: any) => action is ActionsFromAsyncThunk<AsyncThunks[number]>
export function isAsyncThunkAction<
  AsyncThunks extends [AnyAsyncThunk, ...AnyAsyncThunk[]]
>(...asyncThunks: AsyncThunks) {
  if (asyncThunks.length === 0) {
    return (action: any) =>
      hasExpectedRequestMetadata(action, ['pending', 'fulfilled', 'rejected'])
  }

  return (
    action: any
  ): action is ActionsFromAsyncThunk<AsyncThunks[number]> => {
    // note: this type will be correct because we have at least 1 asyncThunk
    const matchers: [Matcher<any>, ...Matcher<any>[]] = [] as any

    for (const asyncThunk of asyncThunks) {
      matchers.push(
        asyncThunk.pending,
        asyncThunk.rejected,
        asyncThunk.fulfilled
      )
    }

    const combinedMatcher = isAnyOf(...matchers)

    return combinedMatcher(action)
  }
}
