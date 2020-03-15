import { PayloadAction } from '../createAction'
import { IsAny } from '../tsHelpers'

/**
 * @alpha
 */
export type EntityId = number | string

/**
 * @alpha
 */
export type Comparer<T> = (a: T, b: T) => number

/**
 * @alpha
 */
export type IdSelector<T> = (model: T) => EntityId

/**
 * @alpha
 */
export interface DictionaryNum<T> {
  [id: number]: T | undefined
}

/**
 * @alpha
 */
export interface Dictionary<T> extends DictionaryNum<T> {
  [id: string]: T | undefined
}

/**
 * @alpha
 */
export type Update<T> = { id: EntityId; changes: Partial<T> }

/**
 * @alpha
 */
export type EntityMap<T> = (entity: T) => T

/**
 * @alpha
 */
export interface EntityState<T> {
  ids: EntityId[]
  entities: Dictionary<T>
}

export interface EntityDefinition<T> {
  selectId: IdSelector<T>
  sortComparer: false | Comparer<T>
}

type PreventAny<S, T> = IsAny<S, EntityState<T>, S>

export interface EntityStateAdapter<T> {
  addOne<S extends EntityState<T>>(state: PreventAny<S, T>, entity: T): S
  addOne<S extends EntityState<T>>(
    state: PreventAny<S, T>,
    action: PayloadAction<T>
  ): S

  addMany<S extends EntityState<T>>(state: PreventAny<S, T>, entities: T[]): S
  addMany<S extends EntityState<T>>(
    state: PreventAny<S, T>,
    entities: PayloadAction<T[]>
  ): S

  setAll<S extends EntityState<T>>(state: PreventAny<S, T>, entities: T[]): S
  setAll<S extends EntityState<T>>(
    state: PreventAny<S, T>,
    entities: PayloadAction<T[]>
  ): S

  removeOne<S extends EntityState<T>>(state: PreventAny<S, T>, key: EntityId): S
  removeOne<S extends EntityState<T>>(
    state: PreventAny<S, T>,
    key: PayloadAction<EntityId>
  ): S

  removeMany<S extends EntityState<T>>(
    state: PreventAny<S, T>,
    keys: EntityId[]
  ): S
  removeMany<S extends EntityState<T>>(
    state: PreventAny<S, T>,
    keys: PayloadAction<EntityId[]>
  ): S

  removeAll<S extends EntityState<T>>(state: PreventAny<S, T>): S

  updateOne<S extends EntityState<T>>(
    state: PreventAny<S, T>,
    update: Update<T>
  ): S
  updateOne<S extends EntityState<T>>(
    state: PreventAny<S, T>,
    update: PayloadAction<Update<T>>
  ): S

  updateMany<S extends EntityState<T>>(
    state: PreventAny<S, T>,
    updates: Update<T>[]
  ): S
  updateMany<S extends EntityState<T>>(
    state: PreventAny<S, T>,
    updates: PayloadAction<Update<T>[]>
  ): S

  upsertOne<S extends EntityState<T>>(state: PreventAny<S, T>, entity: T): S
  upsertOne<S extends EntityState<T>>(
    state: PreventAny<S, T>,
    entity: PayloadAction<T>
  ): S

  upsertMany<S extends EntityState<T>>(
    state: PreventAny<S, T>,
    entities: T[]
  ): S
  upsertMany<S extends EntityState<T>>(
    state: PreventAny<S, T>,
    entities: PayloadAction<T[]>
  ): S

  map<S extends EntityState<T>>(state: PreventAny<S, T>, map: EntityMap<T>): S
}

export interface EntitySelectors<T, V> {
  selectIds: (state: V) => EntityId[]
  selectEntities: (state: V) => Dictionary<T>
  selectAll: (state: V) => T[]
  selectTotal: (state: V) => number
}

/**
 * @alpha
 */
export interface EntityAdapter<T> extends EntityStateAdapter<T> {
  selectId: IdSelector<T>
  sortComparer: false | Comparer<T>
  getInitialState(): EntityState<T>
  getInitialState<S extends object>(state: S): EntityState<T> & S
  getSelectors(): EntitySelectors<T, EntityState<T>>
  getSelectors<V>(
    selectState: (state: V) => EntityState<T>
  ): EntitySelectors<T, V>
}
