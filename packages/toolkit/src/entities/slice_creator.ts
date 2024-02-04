import type {
  CaseReducer,
  ReducerCreator,
  ReducerCreatorEntry,
  SliceCaseReducers,
} from '@reduxjs/toolkit'
import type { PayloadAction } from '../createAction'
import { reducerCreator, type CaseReducerDefinition } from '../createSlice'
import type { WithRequiredProp } from '../tsHelpers'
import type {
  Update,
  EntityAdapter,
  EntityId,
  EntityState,
  EntityStateAdapter,
} from './models'
import { capitalize } from './utils'

export const entityMethodsCreatorType = Symbol()

type DefaultPlural<Single extends string> = Single extends ''
  ? ''
  : `${Single}s`

type EntityReducers<
  T,
  Id extends EntityId,
  State = EntityState<T, Id>,
  Single extends string = '',
  Plural extends string = DefaultPlural<Single>,
> = {
  [K in keyof EntityStateAdapter<
    T,
    Id
  > as `${K}${Capitalize<K extends `${string}One` ? Single : Plural>}`]: EntityStateAdapter<
    T,
    Id
  >[K] extends (state: any) => any
    ? CaseReducerDefinition<State, PayloadAction>
    : EntityStateAdapter<T, Id>[K] extends CaseReducer<any, infer A>
      ? CaseReducerDefinition<State, A>
      : never
}

export interface EntityMethodsCreatorConfig<
  T,
  Id extends EntityId,
  State,
  Single extends string,
  Plural extends string,
> {
  selectEntityState?: (state: State) => EntityState<T, Id>
  name?: Single
  pluralName?: Plural
}

type EntityMethodsCreator<State> =
  State extends EntityState<infer T, infer Id>
    ? {
        <
          T,
          Id extends EntityId,
          Single extends string = '',
          Plural extends string = DefaultPlural<Single>,
        >(
          adapter: EntityAdapter<T, Id>,
          config: WithRequiredProp<
            EntityMethodsCreatorConfig<T, Id, State, Single, Plural>,
            'selectEntityState'
          >,
        ): EntityReducers<T, Id, State, Single, Plural>
        <
          Single extends string = '',
          Plural extends string = DefaultPlural<Single>,
        >(
          adapter: EntityAdapter<T, Id>,
          config?: Omit<
            EntityMethodsCreatorConfig<T, Id, State, Single, Plural>,
            'selectEntityState'
          >,
        ): EntityReducers<T, Id, State, Single, Plural>
      }
    : <
        T,
        Id extends EntityId,
        Single extends string = '',
        Plural extends string = DefaultPlural<Single>,
      >(
        adapter: EntityAdapter<T, Id>,
        config: WithRequiredProp<
          EntityMethodsCreatorConfig<T, Id, State, Single, Plural>,
          'selectEntityState'
        >,
      ) => EntityReducers<T, Id, State, Single, Plural>

declare module '@reduxjs/toolkit' {
  export interface SliceReducerCreators<
    State = any,
    CaseReducers extends SliceCaseReducers<State> = SliceCaseReducers<State>,
    Name extends string = string,
  > {
    [entityMethodsCreatorType]: ReducerCreatorEntry<EntityMethodsCreator<State>>
  }
}

export const entityMethodsCreator = {
  type: entityMethodsCreatorType,
  create<
    T,
    Id extends EntityId,
    State = EntityState<T, Id>,
    Single extends string = '',
    Plural extends string = DefaultPlural<Single>,
  >(
    adapter: EntityAdapter<T, Id>,
    {
      selectEntityState = (state) => state as EntityState<T, Id>,
      name: nameParam = '' as Single,
      pluralName: pluralParam = (nameParam && `${nameParam}s`) as Plural,
    }: EntityMethodsCreatorConfig<T, Id, State, Single, Plural> = {},
  ): EntityReducers<T, Id, State, Single, Plural> {
    // template literal computed keys don't keep their type if there's an unresolved generic
    // so we cast to some intermediate type to at least check we're using the right variables in the right places

    const name = nameParam as 's'
    const pluralName = pluralParam as 'p'
    const reducer = reducerCreator.create
    return {
      [`addOne${capitalize(name)}` as const]: reducer<T>((state, action) => {
        adapter.addOne(selectEntityState(state), action.payload)
      }),
      [`addMany${capitalize(pluralName)}` as const]: reducer<
        readonly T[] | Record<Id, T>
      >((state, action) => {
        adapter.addMany(selectEntityState(state), action.payload)
      }),
      [`setOne${capitalize(name)}` as const]: reducer<T>((state, action) => {
        adapter.setOne(selectEntityState(state), action.payload)
      }),
      [`setMany${capitalize(pluralName)}` as const]: reducer<
        readonly T[] | Record<Id, T>
      >((state, action) => {
        adapter.setMany(selectEntityState(state), action.payload)
      }),
      [`setAll${capitalize(pluralName)}` as const]: reducer<
        readonly T[] | Record<Id, T>
      >((state, action) => {
        adapter.setAll(selectEntityState(state), action.payload)
      }),
      [`removeOne${capitalize(name)}` as const]: reducer<Id>(
        (state, action) => {
          adapter.removeOne(selectEntityState(state), action.payload)
        },
      ),
      [`removeMany${capitalize(pluralName)}` as const]: reducer<readonly Id[]>(
        (state, action) => {
          adapter.removeMany(selectEntityState(state), action.payload)
        },
      ),
      [`removeAll${capitalize(pluralName)}` as const]: reducer((state) => {
        adapter.removeAll(selectEntityState(state))
      }),
      [`upsertOne${capitalize(name)}` as const]: reducer<T>((state, action) => {
        adapter.upsertOne(selectEntityState(state), action.payload)
      }),
      [`upsertMany${capitalize(pluralName)}` as const]: reducer<
        readonly T[] | Record<Id, T>
      >((state, action) => {
        adapter.upsertMany(selectEntityState(state), action.payload)
      }),
      [`updateOne${capitalize(name)}` as const]: reducer<Update<T, Id>>(
        (state, action) => {
          adapter.updateOne(selectEntityState(state), action.payload)
        },
      ),
      [`updateMany${capitalize(pluralName)}` as const]: reducer<
        readonly Update<T, Id>[]
      >((state, action) => {
        adapter.updateMany(selectEntityState(state), action.payload)
      }),
    } satisfies EntityReducers<T, Id, State, 's', 'p'> as any
  },
} satisfies ReducerCreator<typeof entityMethodsCreatorType>
