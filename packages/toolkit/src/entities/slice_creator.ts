import type {
  CreatorCaseReducers,
  ReducerCreator,
  ReducerCreatorEntry,
} from '@reduxjs/toolkit'
import { reducerCreator } from '../createSlice'
import type { WithRequiredProp } from '../tsHelpers'
import type {
  Update,
  EntityAdapter,
  EntityId,
  EntityState,
  DefaultPlural,
  EntityReducers,
} from './models'
import { capitalize } from './utils'

export const entityMethodsCreatorType = /*@__PURE__*/ Symbol()

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
    State,
    CaseReducers extends CreatorCaseReducers<State>,
    Name extends string,
    ReducerPath extends string,
  > {
    [entityMethodsCreatorType]: ReducerCreatorEntry<EntityMethodsCreator<State>>
  }
}

export function createEntityMethods<
  T,
  Id extends EntityId,
  State = EntityState<T, Id>,
  Single extends string = '',
  Plural extends string = DefaultPlural<Single>,
>(
  adapter: EntityAdapter<T, Id>,
  {
    selectEntityState = (state) => state as unknown as EntityState<T, Id>,
    name: nameParam = '' as Single,
    pluralName: pluralParam = (nameParam && `${nameParam}s`) as Plural,
  }: EntityMethodsCreatorConfig<T, Id, State, Single, Plural> = {},
): EntityReducers<T, Id, State, Single, Plural> {
  // template literal computed keys don't keep their type if there's an unresolved generic
  // so we cast to some intermediate type to at least check we're using the right variables in the right places

  const name = nameParam as 's'
  const pluralName = pluralParam as 'p'
  const reducer = reducerCreator.create
  const reducers: EntityReducers<T, Id, State, 's', 'p'> = {
    [`addOne${capitalize(name)}` as const]: reducer<T>((state, action) => {
      adapter.addOne(selectEntityState(state), action)
    }),
    [`addMany${capitalize(pluralName)}` as const]: reducer<
      readonly T[] | Record<Id, T>
    >((state, action) => {
      adapter.addMany(selectEntityState(state), action)
    }),
    [`setOne${capitalize(name)}` as const]: reducer<T>((state, action) => {
      adapter.setOne(selectEntityState(state), action)
    }),
    [`setMany${capitalize(pluralName)}` as const]: reducer<
      readonly T[] | Record<Id, T>
    >((state, action) => {
      adapter.setMany(selectEntityState(state), action)
    }),
    [`setAll${capitalize(pluralName)}` as const]: reducer<
      readonly T[] | Record<Id, T>
    >((state, action) => {
      adapter.setAll(selectEntityState(state), action)
    }),
    [`removeOne${capitalize(name)}` as const]: reducer<Id>((state, action) => {
      adapter.removeOne(selectEntityState(state), action)
    }),
    [`removeMany${capitalize(pluralName)}` as const]: reducer<readonly Id[]>(
      (state, action) => {
        adapter.removeMany(selectEntityState(state), action)
      },
    ),
    [`removeAll${capitalize(pluralName)}` as const]: reducer((state) => {
      adapter.removeAll(selectEntityState(state))
    }),
    [`upsertOne${capitalize(name)}` as const]: reducer<T>((state, action) => {
      adapter.upsertOne(selectEntityState(state), action)
    }),
    [`upsertMany${capitalize(pluralName)}` as const]: reducer<
      readonly T[] | Record<Id, T>
    >((state, action) => {
      adapter.upsertMany(selectEntityState(state), action)
    }),
    [`updateOne${capitalize(name)}` as const]: reducer<Update<T, Id>>(
      (state, action) => {
        adapter.updateOne(selectEntityState(state), action)
      },
    ),
    [`updateMany${capitalize(pluralName)}` as const]: reducer<
      readonly Update<T, Id>[]
    >((state, action) => {
      adapter.updateMany(selectEntityState(state), action)
    }),
  }
  return reducers as any
}

export const entityMethodsCreator: ReducerCreator<
  typeof entityMethodsCreatorType
> = {
  type: entityMethodsCreatorType,
  create: createEntityMethods,
}
