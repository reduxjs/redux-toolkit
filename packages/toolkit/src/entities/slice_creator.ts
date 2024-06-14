import type {
  CaseReducerDefinition,
  CreatorCaseReducers,
  PayloadAction,
  ReducerCreator,
  ReducerCreatorEntry,
} from '@reduxjs/toolkit'
import { reducerCreator } from '../createSlice'
import type { WithRequiredProp } from '../tsHelpers'
import type {
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

const makeWrappedReducerCreator =
  <T, Id extends EntityId, State>(
    selectEntityState: (state: State) => EntityState<T, Id>,
  ) =>
  <Payload>(
    mutator: (
      state: EntityState<T, Id>,
      action: PayloadAction<Payload>,
    ) => void,
  ): CaseReducerDefinition<State, PayloadAction<Payload>> =>
    reducerCreator.create<Payload>((state: State, action) => {
      mutator(selectEntityState(state), action)
    })

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
  const reducer = makeWrappedReducerCreator(selectEntityState)
  const reducers: EntityReducers<T, Id, State, 's', 'p'> = {
    [`addOne${capitalize(name)}` as const]: reducer(adapter.addOne),
    [`addMany${capitalize(pluralName)}` as const]: reducer(adapter.addMany),
    [`setOne${capitalize(name)}` as const]: reducer(adapter.setOne),
    [`setMany${capitalize(pluralName)}` as const]: reducer(adapter.setMany),
    [`setAll${capitalize(pluralName)}` as const]: reducer(adapter.setAll),
    [`removeOne${capitalize(name)}` as const]: reducer(adapter.removeOne),
    [`removeMany${capitalize(pluralName)}` as const]: reducer(
      adapter.removeMany,
    ),
    [`removeAll${capitalize(pluralName)}` as const]: reducer(adapter.removeAll),
    [`upsertOne${capitalize(name)}` as const]: reducer(adapter.upsertOne),
    [`upsertMany${capitalize(pluralName)}` as const]: reducer(
      adapter.upsertMany,
    ),
    [`updateOne${capitalize(name)}` as const]: reducer(adapter.updateOne),
    [`updateMany${capitalize(pluralName)}` as const]: reducer(
      adapter.updateMany,
    ),
  }
  return reducers as any
}

export const entityMethodsCreator: ReducerCreator<
  typeof entityMethodsCreatorType
> = {
  type: entityMethodsCreatorType,
  create: createEntityMethods,
}
