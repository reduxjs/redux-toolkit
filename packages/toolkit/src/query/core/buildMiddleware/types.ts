import type {
  Action,
  AsyncThunkAction,
  Middleware,
  MiddlewareAPI,
  ThunkDispatch,
  UnknownAction,
} from '@reduxjs/toolkit'

import type { ApiContext, ApiModules } from '../../apiTypes'
import type {
  AssertTagTypes,
  EndpointDefinitions,
} from '../../endpointDefinitions'
import type {
  QueryStatus,
  QuerySubState,
  RootState,
  SubscriptionState,
} from '../apiState'
import type {
  MutationThunk,
  QueryThunk,
  QueryThunkArg,
  ThunkResult,
} from '../buildThunks'
import type { CoreModule } from '../module'

export type QueryStateMeta<T> = Record<string, undefined | T>
export type TimeoutId = ReturnType<typeof setTimeout>

export interface InternalMiddlewareState {
  currentSubscriptions: SubscriptionState
}

export interface SubscriptionSelectors {
  getSubscriptions: () => SubscriptionState
  getSubscriptionCount: (queryCacheKey: string) => number
  isRequestSubscribed: (queryCacheKey: string, requestId: string) => boolean
}

export interface BuildMiddlewareInput<
  Definitions extends EndpointDefinitions,
  ReducerPath extends string,
  TagTypes extends string,
> {
  reducerPath: ReducerPath
  context: ApiContext<Definitions>
  queryThunk: QueryThunk
  mutationThunk: MutationThunk
  api: ApiModules<any, EndpointDefinitions, ReducerPath, TagTypes>[CoreModule]
  assertTagType: AssertTagTypes
}

export type SubMiddlewareApi = MiddlewareAPI<
  ThunkDispatch<any, any, UnknownAction>,
  RootState<EndpointDefinitions, string, string>
>

export interface BuildSubMiddlewareInput
  extends BuildMiddlewareInput<EndpointDefinitions, string, string> {
  internalState: InternalMiddlewareState
  refetchQuery(
    querySubState: Exclude<
      QuerySubState<any>,
      { status: QueryStatus.uninitialized }
    >,
    queryCacheKey: string,
    override?: Partial<QueryThunkArg>,
  ): AsyncThunkAction<ThunkResult, QueryThunkArg, {}>
  isThisApiSliceAction: (action: Action) => boolean
}

export type SubMiddlewareBuilder = (
  input: BuildSubMiddlewareInput,
) => Middleware<
  {},
  RootState<EndpointDefinitions, string, string>,
  ThunkDispatch<any, any, UnknownAction>
>

type MwNext = Parameters<ReturnType<Middleware>>[0]

export type ApiMiddlewareInternalHandler<Return = void> = (
  action: Action,
  mwApi: SubMiddlewareApi & { next: MwNext },
  prevState: RootState<EndpointDefinitions, string, string>,
) => Return

export type InternalHandlerBuilder<ReturnType = void> = (
  input: BuildSubMiddlewareInput,
) => ApiMiddlewareInternalHandler<ReturnType>
