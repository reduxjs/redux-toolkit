/**
 * Note: this file should import all other files for type discovery and declaration merging
 */
import { buildThunks, PatchQueryResultThunk, UpdateQueryResultThunk } from './buildThunks';
import { AnyAction, Middleware, Reducer, ThunkAction, ThunkDispatch } from '@reduxjs/toolkit';
import { PrefetchOptions } from '../react-hooks/buildHooks';
import {
  EndpointDefinitions,
  QueryArgFrom,
  QueryDefinition,
  MutationDefinition,
  AssertEntityTypes,
  isQueryDefinition,
  isMutationDefinition,
} from '../endpointDefinitions';
import { CombinedState, QueryKeys, RootState } from './apiState';
import './buildSelectors';
import { Api, Module } from '../apiTypes';
import { onFocus, onFocusLost, onOnline, onOffline } from './setupListeners';
import { buildSlice } from './buildSlice';
import { buildMiddleware } from './buildMiddleware';
import { buildSelectors } from './buildSelectors';
import { buildInitiate } from './buildInitiate';
import { assertCast, Id, safeAssign } from '../tsHelpers';
import { InternalSerializeQueryArgs } from '../defaultSerializeQueryArgs';
import { SliceActions } from './buildSlice';
import { BaseQueryFn } from '../baseQueryTypes';

export const coreModuleName = Symbol();
export type CoreModule = typeof coreModuleName;

declare module '../apiTypes' {
  export interface ApiModules<
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    BaseQuery extends BaseQueryFn,
    Definitions extends EndpointDefinitions,
    ReducerPath extends string,
    EntityTypes extends string
  > {
    [coreModuleName]: {
      reducerPath: ReducerPath;
      internalActions: InternalActions;
      reducer: Reducer<CombinedState<Definitions, EntityTypes, ReducerPath>, AnyAction>;
      middleware: Middleware<{}, RootState<Definitions, string, ReducerPath>, ThunkDispatch<any, any, AnyAction>>;
      util: {
        updateQueryResult: UpdateQueryResultThunk<Definitions, RootState<Definitions, string, ReducerPath>>;
        patchQueryResult: PatchQueryResultThunk<Definitions, RootState<Definitions, string, ReducerPath>>;
      };
      // If you actually care about the return value, use useQuery
      usePrefetch<EndpointName extends QueryKeys<Definitions>>(
        endpointName: EndpointName,
        options?: PrefetchOptions
      ): (arg: QueryArgFrom<Definitions[EndpointName]>, options?: PrefetchOptions) => void;
      endpoints: {
        [K in keyof Definitions]: Definitions[K] extends QueryDefinition<any, any, any, any, any>
          ? Id<ApiEndpointQuery<Definitions[K], Definitions>>
          : Definitions[K] extends MutationDefinition<any, any, any, any, any>
          ? Id<ApiEndpointMutation<Definitions[K], Definitions>>
          : never;
      };
    };
  }
}

export interface ApiEndpointQuery<
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Definition extends QueryDefinition<any, any, any, any, any>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Definitions extends EndpointDefinitions
> {}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface ApiEndpointMutation<
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Definition extends MutationDefinition<any, any, any, any, any>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Definitions extends EndpointDefinitions
> {}

export type InternalActions = SliceActions & {
  prefetchThunk: (endpointName: any, arg: any, options: PrefetchOptions) => ThunkAction<void, any, any, AnyAction>;
} & {
  /**
   * Will cause the RTK Query middleware to trigger any refetchOnReconnect-related behavior
   * @link https://rtk-query-docs.netlify.app/api/setupListeners
   */
  onOnline: typeof onOnline;
  onOffline: typeof onOffline;
  /**
   * Will cause the RTK Query middleware to trigger any refetchOnFocus-related behavior
   * @link https://rtk-query-docs.netlify.app/api/setupListeners
   */
  onFocus: typeof onFocus;
  onFocusLost: typeof onFocusLost;
};

export const coreModule: Module<CoreModule> = {
  name: coreModuleName,
  init(
    api,
    {
      baseQuery,
      entityTypes,
      reducerPath,
      serializeQueryArgs,
      keepUnusedDataFor,
      refetchOnMountOrArgChange,
      refetchOnFocus,
      refetchOnReconnect,
    },
    { endpointDefinitions }
  ) {
    assertCast<InternalSerializeQueryArgs<any>>(serializeQueryArgs);

    const assertEntityType: AssertEntityTypes = (entity) => {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        if (!entityTypes.includes(entity.type as any)) {
          console.error(`Entity type '${entity.type}' was used, but not specified in \`entityTypes\`!`);
        }
      }
      return entity;
    };

    Object.assign(api, {
      reducerPath,
      endpoints: {},
      internalActions: {
        onOnline,
        onOffline,
        onFocus,
        onFocusLost,
      },
      util: {},
    });

    const {
      queryThunk,
      mutationThunk,
      patchQueryResult,
      updateQueryResult,
      prefetchThunk,
      buildMatchThunkActions,
    } = buildThunks({
      baseQuery,
      reducerPath,
      endpointDefinitions,
      api,
      serializeQueryArgs,
    });

    const { reducer, actions: sliceActions } = buildSlice({
      endpointDefinitions,
      queryThunk,
      mutationThunk,
      reducerPath,
      assertEntityType,
      config: { refetchOnFocus, refetchOnReconnect, refetchOnMountOrArgChange, keepUnusedDataFor, reducerPath },
    });

    safeAssign(api.util, { patchQueryResult, updateQueryResult });
    safeAssign(api.internalActions, sliceActions, { prefetchThunk: prefetchThunk as any });

    const { middleware } = buildMiddleware({
      reducerPath,
      endpointDefinitions,
      queryThunk,
      mutationThunk,
      api,
      assertEntityType,
    });

    safeAssign(api, { reducer: reducer as any, middleware });

    const { buildQuerySelector, buildMutationSelector } = buildSelectors({
      serializeQueryArgs: serializeQueryArgs as any,
      reducerPath,
    });

    const { buildInitiateQuery, buildInitiateMutation } = buildInitiate({
      queryThunk,
      mutationThunk,
      api,
      serializeQueryArgs: serializeQueryArgs as any,
    });

    return {
      name: coreModuleName,
      injectEndpoint(endpoint, definition) {
        const anyApi = (api as any) as Api<any, Record<string, any>, string, string, CoreModule>;
        anyApi.endpoints[endpoint] ??= {} as any;
        if (isQueryDefinition(definition)) {
          safeAssign(
            anyApi.endpoints[endpoint],
            {
              select: buildQuerySelector(endpoint, definition),
              initiate: buildInitiateQuery(endpoint, definition),
            },
            buildMatchThunkActions(queryThunk, endpoint)
          );
        } else if (isMutationDefinition(definition)) {
          safeAssign(
            anyApi.endpoints[endpoint],
            {
              select: buildMutationSelector(),
              initiate: buildInitiateMutation(endpoint, definition),
            },
            buildMatchThunkActions(mutationThunk, endpoint)
          );
        }
      },
    };
  },
};
