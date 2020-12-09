import { PayloadAction } from '../createAction'
import { IsAny } from '../tsHelpers'

/**
 * @public
 */
export type EntityId = number | string

/**
 * @public
 */
export type Comparer<T> = (a: T, b: T) => number

/**
 * @public
 */
export type IdSelector<T, IdType extends EntityId = EntityId> = (
  model: T
) => IdType

/**
 * @public
 */
export interface DictionaryNum<T> {
  [id: number]: T | undefined
}

/**
 * @public
 */
export interface Dictionary<T> extends DictionaryNum<T> {
  [id: string]: T | undefined
}

/**
 * @public
 */
export type Update<T, IdType extends EntityId = EntityId> = {
  id: IdType
  changes: Partial<T>
}

/**
 * @public
 */
export interface EntityState<T, IdType extends EntityId = EntityId> {
  ids: IdType[]
  entities: Dictionary<T>
}

/**
 * @public
 */
export interface EntityDefinition<T, IdType extends EntityId = EntityId> {
  selectId: IdSelector<T, IdType>
  sortComparer: false | Comparer<T>
}

export type PreventAny<S, T, IdType extends EntityId = EntityId> = IsAny<
  S,
  EntityState<T, IdType>,
  S
>

/**
 * @public
 */
export interface EntityStateAdapter<T, IdType extends EntityId = EntityId> {
  addOne<S extends EntityState<T, IdType>>(
    state: PreventAny<S, T, IdType>,
    entity: T
  ): S
  addOne<S extends EntityState<T, IdType>>(
    state: PreventAny<S, T, IdType>,
    action: PayloadAction<T>
  ): S

  addMany<S extends EntityState<T, IdType>>(
    state: PreventAny<S, T, IdType>,
    entities: T[] | Record<IdType, T>
  ): S
  addMany<S extends EntityState<T, IdType>>(
    state: PreventAny<S, T, IdType>,
    entities: PayloadAction<T[] | Record<IdType, T>>
  ): S

  setAll<S extends EntityState<T, IdType>>(
    state: PreventAny<S, T, IdType>,
    entities: T[] | Record<IdType, T>
  ): S
  setAll<S extends EntityState<T, IdType>>(
    state: PreventAny<S, T, IdType>,
    entities: PayloadAction<T[] | Record<IdType, T>>
  ): S

  removeOne<S extends EntityState<T, IdType>>(
    state: PreventAny<S, T, IdType>,
    key: IdType
  ): S
  removeOne<S extends EntityState<T, IdType>>(
    state: PreventAny<S, T, IdType>,
    key: PayloadAction<IdType>
  ): S

  removeMany<S extends EntityState<T, IdType>>(
    state: PreventAny<S, T, IdType>,
    keys: IdType[]
  ): S
  removeMany<S extends EntityState<T, IdType>>(
    state: PreventAny<S, T, IdType>,
    keys: PayloadAction<IdType[]>
  ): S

  removeAll<S extends EntityState<T, IdType>>(
    state: PreventAny<S, T, IdType>
  ): S

  updateOne<S extends EntityState<T, IdType>>(
    state: PreventAny<S, T, IdType>,
    update: Update<T, IdType>
  ): S
  updateOne<S extends EntityState<T, IdType>>(
    state: PreventAny<S, T, IdType>,
    update: PayloadAction<Update<T, IdType>>
  ): S

  updateMany<S extends EntityState<T, IdType>>(
    state: PreventAny<S, T, IdType>,
    updates: Update<T, IdType>[]
  ): S
  updateMany<S extends EntityState<T, IdType>>(
    state: PreventAny<S, T, IdType>,
    updates: PayloadAction<Update<T, IdType>[]>
  ): S

  upsertOne<S extends EntityState<T, IdType>>(
    state: PreventAny<S, T, IdType>,
    entity: T
  ): S
  upsertOne<S extends EntityState<T, IdType>>(
    state: PreventAny<S, T, IdType>,
    entity: PayloadAction<T>
  ): S

  upsertMany<S extends EntityState<T, IdType>>(
    state: PreventAny<S, T, IdType>,
    entities: T[] | Record<EntityId, T>
  ): S
  upsertMany<S extends EntityState<T, IdType>>(
    state: PreventAny<S, T, IdType>,
    entities: PayloadAction<T[] | Record<EntityId, T>>
  ): S
}

/**
 * @public
 */
export interface EntitySelectors<T, V, IdType extends EntityId = EntityId> {
  selectIds: (state: V) => IdType[]
  selectEntities: (state: V) => Dictionary<T>
  selectAll: (state: V) => T[]
  selectTotal: (state: V) => number
  selectById: (state: V, id: IdType) => T | undefined
}

/**
 * @public
 */
export interface EntityAdapter<T, IdType extends EntityId = EntityId>
  extends EntityStateAdapter<T> {
  selectId: IdSelector<T, IdType>
  sortComparer: false | Comparer<T>
  getInitialState(): EntityState<T, IdType>
  getInitialState<S extends object>(state: S): EntityState<T, IdType> & S
  getSelectors(): EntitySelectors<T, EntityState<T, IdType>, IdType>
  getSelectors<V>(
    selectState: (state: V) => EntityState<T, IdType>
  ): EntitySelectors<T, V, IdType>
}
