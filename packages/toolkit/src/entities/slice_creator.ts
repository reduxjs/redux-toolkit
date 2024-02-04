import type {
  CaseReducer,
  ReducerCreator,
  ReducerCreatorEntry,
  SliceCaseReducers,
} from '@reduxjs/toolkit'
import type { PayloadAction } from '../createAction'
import type { CaseReducerDefinition, ReducerCreators } from '../createSlice'
import type { WithRequiredProp } from '../tsHelpers'
import type {
  EntityAdapter,
  EntityId,
  EntityState,
  EntityStateAdapter,
} from './models'
import { capitalize } from './utils'

export const entityMethodsCreatorType = Symbol()

type EntityReducers<
  T,
  Id extends EntityId,
  State = EntityState<T, Id>,
  Single extends string = '',
  Plural extends string = Single extends '' ? '' : `${Single}s`,
> = {
  [K in keyof EntityStateAdapter<
    T,
    Id
  > as `${K}${Capitalize<K extends `${string}One` ? Single : Plural>}`]: EntityStateAdapter<
    T,
    Id
  >[K] extends infer Method
    ? Method extends CaseReducer<any, PayloadAction>
      ? CaseReducerDefinition<State, PayloadAction>
      : Method extends CaseReducer<any, PayloadAction<infer Payload>>
        ? CaseReducerDefinition<State, PayloadAction<Payload>>
        : never
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
          Plural extends string = `${Single}s`,
        >(
          this: ReducerCreators<State>,
          adapter: EntityAdapter<T, Id>,
          config: WithRequiredProp<
            EntityMethodsCreatorConfig<T, Id, State, Single, Plural>,
            'selectEntityState'
          >,
        ): EntityReducers<T, Id, State, Single, Plural>
        <Single extends string = '', Plural extends string = `${Single}s`>(
          this: ReducerCreators<State>,
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
        Plural extends string = `${Single}s`,
      >(
        this: ReducerCreators<State>,
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

export const entityMethodsCreator: ReducerCreator<
  typeof entityMethodsCreatorType
> = {
  type: entityMethodsCreatorType,
  create(
    adapter,
    {
      selectEntityState = (state) => state,
      name = '',
      pluralName = name && `${name}s`,
    }: EntityMethodsCreatorConfig<any, any, any, '', ''> = {},
  ): EntityReducers<any, EntityId, any> {
    return {
      [`addOne${capitalize(name)}` as const]: this.reducer<any>(
        (state, action) => {
          adapter.addOne(selectEntityState(state), action.payload)
        },
      ),
      [`addMany${capitalize(pluralName)}` as const]: this.reducer<any>(
        (state, action) => {
          adapter.addMany(selectEntityState(state), action.payload)
        },
      ),
      [`setOne${capitalize(name)}` as const]: this.reducer<any>(
        (state, action) => {
          adapter.setOne(selectEntityState(state), action.payload)
        },
      ),
      [`setMany${capitalize(pluralName)}` as const]: this.reducer<any>(
        (state, action) => {
          adapter.setMany(selectEntityState(state), action.payload)
        },
      ),
      [`setAll${capitalize(pluralName)}` as const]: this.reducer<any>(
        (state, action) => {
          adapter.setAll(selectEntityState(state), action.payload)
        },
      ),
      [`removeOne${capitalize(name)}` as const]: this.reducer<any>(
        (state, action) => {
          adapter.removeOne(selectEntityState(state), action.payload)
        },
      ),
      [`removeMany${capitalize(pluralName)}` as const]: this.reducer<any>(
        (state, action) => {
          adapter.removeMany(selectEntityState(state), action.payload)
        },
      ),
      [`removeAll${capitalize(pluralName)}` as const]: this.reducer((state) => {
        adapter.removeAll(selectEntityState(state))
      }),
      [`upsertOne${capitalize(name)}` as const]: this.reducer<any>(
        (state, action) => {
          adapter.upsertOne(selectEntityState(state), action.payload)
        },
      ),
      [`upsertMany${capitalize(pluralName)}` as const]: this.reducer<any>(
        (state, action) => {
          adapter.upsertMany(selectEntityState(state), action.payload)
        },
      ),
      [`updateOne${capitalize(name)}` as const]: this.reducer<any>(
        (state, action) => {
          adapter.updateOne(selectEntityState(state), action.payload)
        },
      ),
      [`updateMany${capitalize(pluralName)}` as const]: this.reducer<any>(
        (state, action) => {
          adapter.updateMany(selectEntityState(state), action.payload)
        },
      ),
    }
  },
}
