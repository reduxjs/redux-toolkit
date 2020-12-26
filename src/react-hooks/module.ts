import { buildHooks, MutationHooks, QueryHooks } from './buildHooks';
import {
  EndpointDefinitions,
  QueryDefinition,
  MutationDefinition,
  isQueryDefinition,
  isMutationDefinition,
} from '../endpointDefinitions';
import { TS41Hooks } from '../ts41Types';
import { Api, Module } from '../apiTypes';
import { capitalize } from '../utils';
import { safeAssign } from '../tsHelpers';
import { BaseQueryFn } from '../baseQueryTypes';

import {
  useDispatch as rrUseDispatch,
  useSelector as rrUseSelector,
  useStore as rrUseStore,
  batch as rrBatch,
} from 'react-redux';

export const reactHooksModuleName = Symbol();
export type ReactHooksModule = typeof reactHooksModuleName;

declare module '../apiTypes' {
  export interface ApiModules<
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    BaseQuery extends BaseQueryFn,
    Definitions extends EndpointDefinitions,
    ReducerPath extends string,
    EntityTypes extends string
  > {
    [reactHooksModuleName]: {
      endpoints: {
        [K in keyof Definitions]: Definitions[K] extends QueryDefinition<any, any, any, any, any>
          ? QueryHooks<Definitions[K]>
          : Definitions[K] extends MutationDefinition<any, any, any, any, any>
          ? MutationHooks<Definitions[K]>
          : never;
      };
    } & TS41Hooks<Definitions>;
  }
}

export interface ReactHooksModuleOptions {
  batch?: typeof import('react-redux').batch;
  useDispatch?: typeof import('react-redux').useDispatch;
  useSelector?: typeof import('react-redux').useSelector;
  useStore?: typeof import('react-redux').useStore;
}

export const reactHooksModule = ({
  batch = rrBatch,
  useDispatch = rrUseDispatch,
  useSelector = rrUseSelector,
  useStore = rrUseStore,
}: ReactHooksModuleOptions = {}): Module<ReactHooksModule> => ({
  name: reactHooksModuleName,
  init(api, options, context) {
    const { buildQueryHooks, buildMutationHook, usePrefetch } = buildHooks({
      api,
      moduleOptions: { batch, useDispatch, useSelector, useStore },
    });
    safeAssign(api, { usePrefetch });
    safeAssign(context, { batch });

    return {
      injectEndpoint(endpoint, definition) {
        const anyApi = (api as any) as Api<any, Record<string, any>, string, string, ReactHooksModule>;
        if (isQueryDefinition(definition)) {
          const { useQuery, useQueryState, useQuerySubscription } = buildQueryHooks(endpoint);
          safeAssign(anyApi.endpoints[endpoint], {
            useQuery,
            useQueryState,
            useQuerySubscription,
          });
          (api as any)[`use${capitalize(endpoint)}Query`] = useQuery;
        } else if (isMutationDefinition(definition)) {
          const useMutation = buildMutationHook(endpoint);
          safeAssign(anyApi.endpoints[endpoint], {
            useMutation,
          });
          (api as any)[`use${capitalize(endpoint)}Mutation`] = useMutation;
        }
      },
    };
  },
});
