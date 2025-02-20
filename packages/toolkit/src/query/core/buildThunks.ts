import type {
  AsyncThunk,
  AsyncThunkPayloadCreator,
  Draft,
  ThunkAction,
  ThunkDispatch,
  UnknownAction,
} from '@reduxjs/toolkit'
import type { Patch } from 'immer'
import { isDraftable, produceWithPatches } from 'immer'
import type { Api, ApiContext } from '../apiTypes'
import type {
  BaseQueryError,
  BaseQueryFn,
  QueryReturnValue,
} from '../baseQueryTypes'
import type { InternalSerializeQueryArgs } from '../defaultSerializeQueryArgs'
import type {
  AssertTagTypes,
  EndpointDefinition,
  EndpointDefinitions,
  MutationDefinition,
  QueryArgFrom,
  QueryDefinition,
  ResultTypeFrom,
} from '../endpointDefinitions'
import { calculateProvidedBy, isQueryDefinition } from '../endpointDefinitions'
import { HandledError } from '../HandledError'
import type { UnwrapPromise } from '../tsHelpers'
import type { InfiniteQueryDefinition } from '@internal/query/endpointDefinitions'
import type {
  RootState,
  QueryKeys,
  QuerySubstateIdentifier,
  InfiniteData,
  InfiniteQueryConfigOptions,
} from './apiState'
import { QueryStatus } from './apiState'
import type {
  QueryActionCreatorResult,
  StartInfiniteQueryActionCreatorOptions,
  StartQueryActionCreatorOptions,
} from './buildInitiate'
import { forceQueryFnSymbol, isUpsertQuery } from './buildInitiate'
import type { ApiEndpointQuery, PrefetchOptions } from './module'
import {
  createAsyncThunk,
  isAllOf,
  isFulfilled,
  isPending,
  isRejected,
  isRejectedWithValue,
  SHOULD_AUTOBATCH,
} from './rtkImports'

export type BuildThunksApiEndpointQuery<
  Definition extends QueryDefinition<any, any, any, any, any>,
> = Matchers<QueryThunk, Definition>

export type ApiEndpointInfiniteQuery<
  Definition extends InfiniteQueryDefinition<any, any, any, any, any>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Definitions extends EndpointDefinitions,
> = Matchers<QueryThunk, Definition>

export type BuildThunksApiEndpointMutation<
  Definition extends MutationDefinition<any, any, any, any, any>,
> = Matchers<MutationThunk, Definition>

type EndpointThunk<
  Thunk extends QueryThunk | MutationThunk,
  Definition extends EndpointDefinition<any, any, any, any>,
> =
  Definition extends EndpointDefinition<
    infer QueryArg,
    infer BaseQueryFn,
    any,
    infer ResultType
  >
    ? Thunk extends AsyncThunk<unknown, infer ATArg, infer ATConfig>
      ? AsyncThunk<
          ResultType,
          ATArg & { originalArgs: QueryArg },
          ATConfig & { rejectValue: BaseQueryError<BaseQueryFn> }
        >
      : never
    : never

export type PendingAction<
  Thunk extends QueryThunk | MutationThunk,
  Definition extends EndpointDefinition<any, any, any, any>,
> = ReturnType<EndpointThunk<Thunk, Definition>['pending']>

export type FulfilledAction<
  Thunk extends QueryThunk | MutationThunk,
  Definition extends EndpointDefinition<any, any, any, any>,
> = ReturnType<EndpointThunk<Thunk, Definition>['fulfilled']>

export type RejectedAction<
  Thunk extends QueryThunk | MutationThunk,
  Definition extends EndpointDefinition<any, any, any, any>,
> = ReturnType<EndpointThunk<Thunk, Definition>['rejected']>

export type Matcher<M> = (value: any) => value is M

export interface Matchers<
  Thunk extends QueryThunk | MutationThunk,
  Definition extends EndpointDefinition<any, any, any, any>,
> {
  matchPending: Matcher<PendingAction<Thunk, Definition>>
  matchFulfilled: Matcher<FulfilledAction<Thunk, Definition>>
  matchRejected: Matcher<RejectedAction<Thunk, Definition>>
}

export type QueryThunkArg = QuerySubstateIdentifier &
  StartQueryActionCreatorOptions & {
    type: 'query'
    originalArgs: unknown
    endpointName: string
  }

export type InfiniteQueryThunkArg = QuerySubstateIdentifier &
  StartInfiniteQueryActionCreatorOptions & {
    type: `query`
    originalArgs: unknown
    endpointName: string
    data: InfiniteData<unknown>
    param: unknown
    previous?: boolean
    direction?: 'forward' | 'backwards'
  }

type MutationThunkArg = {
  type: 'mutation'
  originalArgs: unknown
  endpointName: string
  track?: boolean
  fixedCacheKey?: string
}

export type ThunkResult = unknown

export type ThunkApiMetaConfig = {
  pendingMeta: {
    startedTimeStamp: number
    [SHOULD_AUTOBATCH]: true
  }
  fulfilledMeta: {
    fulfilledTimeStamp: number
    baseQueryMeta: unknown
    [SHOULD_AUTOBATCH]: true
  }
  rejectedMeta: {
    baseQueryMeta: unknown
    [SHOULD_AUTOBATCH]: true
  }
}
export type QueryThunk = AsyncThunk<
  ThunkResult,
  QueryThunkArg,
  ThunkApiMetaConfig
>
export type InfiniteQueryThunk = AsyncThunk<
  ThunkResult,
  InfiniteQueryThunkArg,
  ThunkApiMetaConfig
>
export type MutationThunk = AsyncThunk<
  ThunkResult,
  MutationThunkArg,
  ThunkApiMetaConfig
>

function defaultTransformResponse(baseQueryReturnValue: unknown) {
  return baseQueryReturnValue
}

export type MaybeDrafted<T> = T | Draft<T>
export type Recipe<T> = (data: MaybeDrafted<T>) => void | MaybeDrafted<T>
export type UpsertRecipe<T> = (
  data: MaybeDrafted<T> | undefined,
) => void | MaybeDrafted<T>

export type PatchQueryDataThunk<
  Definitions extends EndpointDefinitions,
  PartialState,
> = <EndpointName extends QueryKeys<Definitions>>(
  endpointName: EndpointName,
  arg: QueryArgFrom<Definitions[EndpointName]>,
  patches: readonly Patch[],
  updateProvided?: boolean,
) => ThunkAction<void, PartialState, any, UnknownAction>

export type UpdateQueryDataThunk<
  Definitions extends EndpointDefinitions,
  PartialState,
> = <EndpointName extends QueryKeys<Definitions>>(
  endpointName: EndpointName,
  arg: QueryArgFrom<Definitions[EndpointName]>,
  updateRecipe: Recipe<ResultTypeFrom<Definitions[EndpointName]>>,
  updateProvided?: boolean,
) => ThunkAction<PatchCollection, PartialState, any, UnknownAction>

export type UpsertQueryDataThunk<
  Definitions extends EndpointDefinitions,
  PartialState,
> = <EndpointName extends QueryKeys<Definitions>>(
  endpointName: EndpointName,
  arg: QueryArgFrom<Definitions[EndpointName]>,
  value: ResultTypeFrom<Definitions[EndpointName]>,
) => ThunkAction<
  QueryActionCreatorResult<
    Definitions[EndpointName] extends QueryDefinition<any, any, any, any>
      ? Definitions[EndpointName]
      : never
  >,
  PartialState,
  any,
  UnknownAction
>

/**
 * An object returned from dispatching a `api.util.updateQueryData` call.
 */
export type PatchCollection = {
  /**
   * An `immer` Patch describing the cache update.
   */
  patches: Patch[]
  /**
   * An `immer` Patch to revert the cache update.
   */
  inversePatches: Patch[]
  /**
   * A function that will undo the cache update.
   */
  undo: () => void
}

export function buildThunks<
  BaseQuery extends BaseQueryFn,
  ReducerPath extends string,
  Definitions extends EndpointDefinitions,
>({
  reducerPath,
  baseQuery,
  context: { endpointDefinitions },
  serializeQueryArgs,
  api,
  assertTagType,
}: {
  baseQuery: BaseQuery
  reducerPath: ReducerPath
  context: ApiContext<Definitions>
  serializeQueryArgs: InternalSerializeQueryArgs
  api: Api<BaseQuery, Definitions, ReducerPath, any>
  assertTagType: AssertTagTypes
}) {
  type State = RootState<any, string, ReducerPath>

  const patchQueryData: PatchQueryDataThunk<EndpointDefinitions, State> =
    (endpointName, arg, patches, updateProvided) => (dispatch, getState) => {
      const endpointDefinition = endpointDefinitions[endpointName]

      const queryCacheKey = serializeQueryArgs({
        queryArgs: arg,
        endpointDefinition,
        endpointName,
      })

      dispatch(
        api.internalActions.queryResultPatched({ queryCacheKey, patches }),
      )

      if (!updateProvided) {
        return
      }

      const newValue = api.endpoints[endpointName].select(arg)(
        // Work around TS 4.1 mismatch
        getState() as RootState<any, any, any>,
      )

      const providedTags = calculateProvidedBy(
        endpointDefinition.providesTags,
        newValue.data,
        undefined,
        arg,
        {},
        assertTagType,
      )

      dispatch(
        api.internalActions.updateProvidedBy({ queryCacheKey, providedTags }),
      )
    }

  function addToStart<T>(items: Array<T>, item: T, max = 0): Array<T> {
    const newItems = [item, ...items]
    return max && newItems.length > max ? newItems.slice(0, -1) : newItems
  }

  function addToEnd<T>(items: Array<T>, item: T, max = 0): Array<T> {
    const newItems = [...items, item]
    return max && newItems.length > max ? newItems.slice(1) : newItems
  }

  const updateQueryData: UpdateQueryDataThunk<EndpointDefinitions, State> =
    (endpointName, arg, updateRecipe, updateProvided = true) =>
    (dispatch, getState) => {
      const endpointDefinition = api.endpoints[endpointName]

      const currentState = endpointDefinition.select(arg)(
        // Work around TS 4.1 mismatch
        getState() as RootState<any, any, any>,
      )

      const ret: PatchCollection = {
        patches: [],
        inversePatches: [],
        undo: () =>
          dispatch(
            api.util.patchQueryData(
              endpointName,
              arg,
              ret.inversePatches,
              updateProvided,
            ),
          ),
      }
      if (currentState.status === QueryStatus.uninitialized) {
        return ret
      }
      let newValue
      if ('data' in currentState) {
        if (isDraftable(currentState.data)) {
          const [value, patches, inversePatches] = produceWithPatches(
            currentState.data,
            updateRecipe,
          )
          ret.patches.push(...patches)
          ret.inversePatches.push(...inversePatches)
          newValue = value
        } else {
          newValue = updateRecipe(currentState.data)
          ret.patches.push({ op: 'replace', path: [], value: newValue })
          ret.inversePatches.push({
            op: 'replace',
            path: [],
            value: currentState.data,
          })
        }
      }

      if (ret.patches.length === 0) {
        return ret
      }

      dispatch(
        api.util.patchQueryData(endpointName, arg, ret.patches, updateProvided),
      )

      return ret
    }

  const upsertQueryData: UpsertQueryDataThunk<Definitions, State> =
    (endpointName, arg, value) => (dispatch) => {
      return dispatch(
        (
          api.endpoints[endpointName] as ApiEndpointQuery<
            QueryDefinition<any, any, any, any, any>,
            Definitions
          >
        ).initiate(arg, {
          subscribe: false,
          forceRefetch: true,
          [forceQueryFnSymbol]: () => ({
            data: value,
          }),
        }),
      )
    }

  const executeEndpoint: AsyncThunkPayloadCreator<
    ThunkResult,
    QueryThunkArg | MutationThunkArg | InfiniteQueryThunkArg,
    ThunkApiMetaConfig & { state: RootState<any, string, ReducerPath> }
  > = async (
    arg,
    {
      signal,
      abort,
      rejectWithValue,
      fulfillWithValue,
      dispatch,
      getState,
      extra,
    },
  ) => {
    const endpointDefinition = endpointDefinitions[arg.endpointName]

    try {
      let transformResponse: (
        baseQueryReturnValue: any,
        meta: any,
        arg: any,
      ) => any = defaultTransformResponse
      let result: QueryReturnValue
      const baseQueryApi = {
        signal,
        abort,
        dispatch,
        getState,
        extra,
        endpoint: arg.endpointName,
        type: arg.type,
        forced:
          arg.type === 'query' ? isForcedQuery(arg, getState()) : undefined,
        queryCacheKey: arg.type === 'query' ? arg.queryCacheKey : undefined,
      }

      const forceQueryFn =
        arg.type === 'query' ? arg[forceQueryFnSymbol] : undefined
      if (forceQueryFn) {
        result = forceQueryFn()
      } else if (endpointDefinition.query) {
        const oldPages: any[] = []
        const oldPageParams: any[] = []

        const fetchPage = async (
          data: InfiniteData<unknown>,
          param: unknown,
          previous?: boolean,
        ): Promise<QueryReturnValue> => {
          console.log('fetchPage', data, param, previous)

          if (param == null && data.pages.length) {
            return Promise.resolve({ data })
          }

          const page = await baseQuery(
            endpointDefinition.query(param),
            baseQueryApi,
            endpointDefinition.extraOptions as any,
          )

          const maxPages = 20
          const addTo = previous ? addToStart : addToEnd

          return {
            data: {
              pages: addTo(data.pages, page.data, maxPages),
              pageParams: addTo(data.pageParams, param, maxPages),
            },
          }
        }

        if ('infiniteQueryOptions' in endpointDefinition) {
          if ('direction' in arg && arg.direction && arg.data.pages.length) {
            const previous = arg.direction === 'backwards'
            const pageParamFn = previous
              ? getPreviousPageParam
              : getNextPageParam
            const oldData = arg.data
            const param = pageParamFn(
              endpointDefinition.infiniteQueryOptions,
              oldData,
            )

            result = await fetchPage(oldData, param, previous)
          } else {
            // Fetch first page
            result = await fetchPage(
              { pages: [], pageParams: [] },
              oldPageParams[0] ?? arg.originalArgs,
            )

            //original
            // const remainingPages = pages ?? oldPages.length
            const remainingPages = oldPages.length

            // Fetch remaining pages
            for (let i = 1; i < remainingPages; i++) {
              // @ts-ignore
              const param = getNextPageParam(
                arg.infiniteQueryOptions,
                result.data as InfiniteData<unknown>,
              )
              result = await fetchPage(
                result.data as InfiniteData<unknown>,
                param,
              )
            }
          }
        } else {
          result = await baseQuery(
            endpointDefinition.query(arg.originalArgs),
            baseQueryApi,
            endpointDefinition.extraOptions as any,
          )

          if (endpointDefinition.transformResponse) {
            transformResponse = endpointDefinition.transformResponse
          }
        }
      } else {
        result = await endpointDefinition.queryFn(
          arg.originalArgs,
          baseQueryApi,
          endpointDefinition.extraOptions as any,
          (arg) =>
            baseQuery(
              arg,
              baseQueryApi,
              endpointDefinition.extraOptions as any,
            ),
        )
      }

      if (
        typeof process !== 'undefined' &&
        process.env.NODE_ENV === 'development'
      ) {
        const what = endpointDefinition.query ? '`baseQuery`' : '`queryFn`'
        let err: undefined | string
        if (!result) {
          err = `${what} did not return anything.`
        } else if (typeof result !== 'object') {
          err = `${what} did not return an object.`
        } else if (result.error && result.data) {
          err = `${what} returned an object containing both \`error\` and \`result\`.`
        } else if (result.error === undefined && result.data === undefined) {
          err = `${what} returned an object containing neither a valid \`error\` and \`result\`. At least one of them should not be \`undefined\``
        } else {
          for (const key of Object.keys(result)) {
            if (key !== 'error' && key !== 'data' && key !== 'meta') {
              err = `The object returned by ${what} has the unknown property ${key}.`
              break
            }
          }
        }
        if (err) {
          console.error(
            `Error encountered handling the endpoint ${arg.endpointName}.
              ${err}
              It needs to return an object with either the shape \`{ data: <value> }\` or \`{ error: <value> }\` that may contain an optional \`meta\` property.
              Object returned was:`,
            result,
          )
        }
      }

      if (result.error) throw new HandledError(result.error, result.meta)

      return fulfillWithValue(
        await transformResponse(result.data, result.meta, arg.originalArgs),
        {
          fulfilledTimeStamp: Date.now(),
          baseQueryMeta: result.meta,
          [SHOULD_AUTOBATCH]: true,
        },
      )
    } catch (error) {
      let catchedError = error
      if (catchedError instanceof HandledError) {
        let transformErrorResponse: (
          baseQueryReturnValue: any,
          meta: any,
          arg: any,
        ) => any = defaultTransformResponse

        if (
          endpointDefinition.query &&
          endpointDefinition.transformErrorResponse
        ) {
          transformErrorResponse = endpointDefinition.transformErrorResponse
        }
        try {
          return rejectWithValue(
            await transformErrorResponse(
              catchedError.value,
              catchedError.meta,
              arg.originalArgs,
            ),
            { baseQueryMeta: catchedError.meta, [SHOULD_AUTOBATCH]: true },
          )
        } catch (e) {
          catchedError = e
        }
      }
      if (
        typeof process !== 'undefined' &&
        process.env.NODE_ENV !== 'production'
      ) {
        console.error(
          `An unhandled error occurred processing a request for the endpoint "${arg.endpointName}".
In the case of an unhandled error, no tags will be "provided" or "invalidated".`,
          catchedError,
        )
      } else {
        console.error(catchedError)
      }
      throw catchedError
    }
  }

  function getNextPageParam(
    options: InfiniteQueryConfigOptions<any>,
    { pages, pageParams }: InfiniteData<unknown>,
  ): unknown | undefined {
    const lastIndex = pages.length - 1
    return options.getNextPageParam(
      pages[lastIndex],
      pages,
      pageParams[lastIndex],
      pageParams,
    )
  }

  function getPreviousPageParam(
    options: InfiniteQueryConfigOptions<any>,
    { pages, pageParams }: InfiniteData<unknown>,
  ): unknown | undefined {
    return options.getPreviousPageParam?.(
      pages[0],
      pages,
      pageParams[0],
      pageParams,
    )
  }

  function isForcedQuery(
    arg: QueryThunkArg,
    state: RootState<any, string, ReducerPath>,
  ) {
    const requestState = state[reducerPath]?.queries?.[arg.queryCacheKey]
    const baseFetchOnMountOrArgChange =
      state[reducerPath]?.config.refetchOnMountOrArgChange

    const fulfilledVal = requestState?.fulfilledTimeStamp
    const refetchVal =
      arg.forceRefetch ?? (arg.subscribe && baseFetchOnMountOrArgChange)

    if (refetchVal) {
      // Return if it's true or compare the dates because it must be a number
      return (
        refetchVal === true ||
        (Number(new Date()) - Number(fulfilledVal)) / 1000 >= refetchVal
      )
    }
    return false
  }

  const queryThunk = createAsyncThunk<
    ThunkResult,
    QueryThunkArg,
    ThunkApiMetaConfig & { state: RootState<any, string, ReducerPath> }
  >(`${reducerPath}/executeQuery`, executeEndpoint, {
    getPendingMeta() {
      return { startedTimeStamp: Date.now(), [SHOULD_AUTOBATCH]: true }
    },
    condition(queryThunkArgs, { getState }) {
      const state = getState()

      const requestState =
        state[reducerPath]?.queries?.[queryThunkArgs.queryCacheKey]
      const fulfilledVal = requestState?.fulfilledTimeStamp
      const currentArg = queryThunkArgs.originalArgs
      const previousArg = requestState?.originalArgs
      const endpointDefinition =
        endpointDefinitions[queryThunkArgs.endpointName]

      // Order of these checks matters.
      // In order for `upsertQueryData` to successfully run while an existing request is in flight,
      /// we have to check for that first, otherwise `queryThunk` will bail out and not run at all.
      if (isUpsertQuery(queryThunkArgs)) {
        return true
      }

      // Don't retry a request that's currently in-flight
      if (requestState?.status === 'pending') {
        return false
      }

      // if this is forced, continue
      if (isForcedQuery(queryThunkArgs, state)) {
        return true
      }

      if (
        isQueryDefinition(endpointDefinition) &&
        endpointDefinition?.forceRefetch?.({
          currentArg,
          previousArg,
          endpointState: requestState,
          state,
        })
      ) {
        return true
      }

      // Pull from the cache unless we explicitly force refetch or qualify based on time
      if (fulfilledVal) {
        // Value is cached and we didn't specify to refresh, skip it.
        return false
      }

      return true
    },
    dispatchConditionRejection: true,
  })

  const infiniteQueryThunk = createAsyncThunk<
    ThunkResult,
    InfiniteQueryThunkArg,
    ThunkApiMetaConfig & { state: RootState<any, string, ReducerPath> }
  >(`${reducerPath}/executeQuery`, executeEndpoint, {
    getPendingMeta(queryThunkArgs) {
      return {
        startedTimeStamp: Date.now(),
        [SHOULD_AUTOBATCH]: true,
        direction: queryThunkArgs.arg.direction,
        data: queryThunkArgs.arg.data,
      }
    },
    condition(queryThunkArgs, { getState }) {
      const state = getState()

      const requestState =
        state[reducerPath]?.queries?.[queryThunkArgs.queryCacheKey]
      const fulfilledVal = requestState?.fulfilledTimeStamp
      const currentArg = queryThunkArgs.originalArgs
      const previousArg = requestState?.originalArgs
      const endpointDefinition =
        endpointDefinitions[queryThunkArgs.endpointName]
      const direction = queryThunkArgs.direction

      // Order of these checks matters.
      // In order for `upsertQueryData` to successfully run while an existing request is in flight,
      /// we have to check for that first, otherwise `queryThunk` will bail out and not run at all.
      // if (isUpsertQuery(queryThunkArgs)) {
      //   return true
      // }

      // Don't retry a request that's currently in-flight
      if (requestState?.status === 'pending') {
        return false
      }

      // if this is forced, continue
      // if (isForcedQuery(queryThunkArgs, state)) {
      //   return true
      // }

      if (
        isQueryDefinition(endpointDefinition) &&
        endpointDefinition?.forceRefetch?.({
          currentArg,
          previousArg,
          endpointState: requestState,
          state,
        })
      ) {
        return true
      }

      // Pull from the cache unless we explicitly force refetch or qualify based on time
      if (fulfilledVal && !direction) {
        // Value is cached and we didn't specify to refresh, skip it.
        return false
      }

      return true
    },
    dispatchConditionRejection: true,
  })

  const mutationThunk = createAsyncThunk<
    ThunkResult,
    MutationThunkArg,
    ThunkApiMetaConfig & { state: RootState<any, string, ReducerPath> }
  >(`${reducerPath}/executeMutation`, executeEndpoint, {
    getPendingMeta() {
      return { startedTimeStamp: Date.now(), [SHOULD_AUTOBATCH]: true }
    },
  })

  const hasTheForce = (options: any): options is { force: boolean } =>
    'force' in options
  const hasMaxAge = (
    options: any,
  ): options is { ifOlderThan: false | number } => 'ifOlderThan' in options

  const prefetch =
    <EndpointName extends QueryKeys<Definitions>>(
      endpointName: EndpointName,
      arg: any,
      options: PrefetchOptions,
    ): ThunkAction<void, any, any, UnknownAction> =>
    (dispatch: ThunkDispatch<any, any, any>, getState: () => any) => {
      const force = hasTheForce(options) && options.force
      const maxAge = hasMaxAge(options) && options.ifOlderThan

      const queryAction = (force: boolean = true) => {
        const options = { forceRefetch: force, isPrefetch: true }
        return (
          api.endpoints[endpointName] as ApiEndpointQuery<any, any>
        ).initiate(arg, options)
      }
      const latestStateValue = (
        api.endpoints[endpointName] as ApiEndpointQuery<any, any>
      ).select(arg)(getState())

      if (force) {
        dispatch(queryAction())
      } else if (maxAge) {
        const lastFulfilledTs = latestStateValue?.fulfilledTimeStamp
        if (!lastFulfilledTs) {
          dispatch(queryAction())
          return
        }
        const shouldRetrigger =
          (Number(new Date()) - Number(new Date(lastFulfilledTs))) / 1000 >=
          maxAge
        if (shouldRetrigger) {
          dispatch(queryAction())
        }
      } else {
        // If prefetching with no options, just let it try
        dispatch(queryAction(false))
      }
    }

  function matchesEndpoint(endpointName: string) {
    return (action: any): action is UnknownAction =>
      action?.meta?.arg?.endpointName === endpointName
  }

  function buildMatchThunkActions<
    Thunk extends
      | AsyncThunk<any, QueryThunkArg, ThunkApiMetaConfig>
      | AsyncThunk<any, MutationThunkArg, ThunkApiMetaConfig>,
  >(thunk: Thunk, endpointName: string) {
    return {
      matchPending: isAllOf(isPending(thunk), matchesEndpoint(endpointName)),
      matchFulfilled: isAllOf(
        isFulfilled(thunk),
        matchesEndpoint(endpointName),
      ),
      matchRejected: isAllOf(isRejected(thunk), matchesEndpoint(endpointName)),
    } as Matchers<Thunk, any>
  }

  return {
    queryThunk,
    mutationThunk,
    infiniteQueryThunk,
    prefetch,
    updateQueryData,
    upsertQueryData,
    patchQueryData,
    buildMatchThunkActions,
  }
}

export function calculateProvidedByThunk(
  action: UnwrapPromise<
    ReturnType<ReturnType<QueryThunk>> | ReturnType<ReturnType<MutationThunk>>
  >,
  type: 'providesTags' | 'invalidatesTags',
  endpointDefinitions: EndpointDefinitions,
  assertTagType: AssertTagTypes,
) {
  return calculateProvidedBy(
    endpointDefinitions[action.meta.arg.endpointName][type],
    isFulfilled(action) ? action.payload : undefined,
    isRejectedWithValue(action) ? action.payload : undefined,
    action.meta.arg.originalArgs,
    'baseQueryMeta' in action.meta ? action.meta.baseQueryMeta : undefined,
    assertTagType,
  )
}
