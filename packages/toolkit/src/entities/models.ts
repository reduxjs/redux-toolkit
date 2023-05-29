import type { PayloadAction } from '../createAction'
import type { IsAny } from '../tsHelpers'
import type { GetSelectorsOptions } from './state_selectors'

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
export type IdSelector<T, Id extends EntityId> = (model: T) => Id

/**
 * @public
 */
export type Dictionary<T, Id extends EntityId> = Partial<Record<Id, T>>

/**
 * @public
 */
export type Update<T, Id extends EntityId> = { id: Id; changes: Partial<T> }

/**
 * @public
 */
export interface EntityState<T, Id extends EntityId> {
  ids: Id[]
  entities: Dictionary<T, Id>
}

/**
 * @public
 */
export interface EntityDefinition<T, Id extends EntityId> {
  selectId: IdSelector<T, Id>
  sortComparer: false | Comparer<T>
}

export type PreventAny<S, T, Id extends EntityId> = IsAny<
  S,
  EntityState<T, Id>,
  S
>

/**
 * @public
 */
export interface EntityStateAdapter<T, Id extends EntityId> {
  addOne<S extends EntityState<T, Id>>(
    state: PreventAny<S, T, Id>,
    entity: T
  ): S
  addOne<S extends EntityState<T, Id>>(
    state: PreventAny<S, T, Id>,
    action: PayloadAction<T>
  ): S

  addMany<S extends EntityState<T, Id>>(
    state: PreventAny<S, T, Id>,
    entities: readonly T[] | Record<Id, T>
  ): S
  addMany<S extends EntityState<T, Id>>(
    state: PreventAny<S, T, Id>,
    entities: PayloadAction<readonly T[] | Record<Id, T>>
  ): S

  setOne<S extends EntityState<T, Id>>(
    state: PreventAny<S, T, Id>,
    entity: T
  ): S
  setOne<S extends EntityState<T, Id>>(
    state: PreventAny<S, T, Id>,
    action: PayloadAction<T>
  ): S
  setMany<S extends EntityState<T, Id>>(
    state: PreventAny<S, T, Id>,
    entities: readonly T[] | Record<Id, T>
  ): S
  setMany<S extends EntityState<T, Id>>(
    state: PreventAny<S, T, Id>,
    entities: PayloadAction<readonly T[] | Record<Id, T>>
  ): S
  setAll<S extends EntityState<T, Id>>(
    state: PreventAny<S, T, Id>,
    entities: readonly T[] | Record<Id, T>
  ): S
  setAll<S extends EntityState<T, Id>>(
    state: PreventAny<S, T, Id>,
    entities: PayloadAction<readonly T[] | Record<Id, T>>
  ): S

  removeOne<S extends EntityState<T, Id>>(
    state: PreventAny<S, T, Id>,
    key: Id
  ): S
  removeOne<S extends EntityState<T, Id>>(
    state: PreventAny<S, T, Id>,
    key: PayloadAction<Id>
  ): S

  removeMany<S extends EntityState<T, Id>>(
    state: PreventAny<S, T, Id>,
    keys: readonly Id[]
  ): S
  removeMany<S extends EntityState<T, Id>>(
    state: PreventAny<S, T, Id>,
    keys: PayloadAction<readonly Id[]>
  ): S

  removeAll<S extends EntityState<T, Id>>(state: PreventAny<S, T, Id>): S

  updateOne<S extends EntityState<T, Id>>(
    state: PreventAny<S, T, Id>,
    update: Update<T, Id>
  ): S
  updateOne<S extends EntityState<T, Id>>(
    state: PreventAny<S, T, Id>,
    update: PayloadAction<Update<T, Id>>
  ): S

  updateMany<S extends EntityState<T, Id>>(
    state: PreventAny<S, T, Id>,
    updates: ReadonlyArray<Update<T, Id>>
  ): S
  updateMany<S extends EntityState<T, Id>>(
    state: PreventAny<S, T, Id>,
    updates: PayloadAction<ReadonlyArray<Update<T, Id>>>
  ): S

  upsertOne<S extends EntityState<T, Id>>(
    state: PreventAny<S, T, Id>,
    entity: T
  ): S
  upsertOne<S extends EntityState<T, Id>>(
    state: PreventAny<S, T, Id>,
    entity: PayloadAction<T>
  ): S

  upsertMany<S extends EntityState<T, Id>>(
    state: PreventAny<S, T, Id>,
    entities: readonly T[] | Record<Id, T>
  ): S
  upsertMany<S extends EntityState<T, Id>>(
    state: PreventAny<S, T, Id>,
    entities: PayloadAction<readonly T[] | Record<Id, T>>
  ): S
}

/**
 * @public
 */
export interface EntitySelectors<T, V, Id extends EntityId> {
  selectIds: (state: V) => Id[]
  selectEntities: (state: V) => Dictionary<T, Id>
  selectAll: (state: V) => T[]
  selectTotal: (state: V) => number
  selectById: (state: V, id: Id) => T | undefined
}

/**
 * @public
 */
export interface EntityAdapter<T, Id extends EntityId>
  extends EntityStateAdapter<T, Id> {
  selectId: IdSelector<T, Id>
  sortComparer: false | Comparer<T>
  getInitialState(): EntityState<T, Id>
  getInitialState<S extends object>(state: S): EntityState<T, Id> & S
  getSelectors(
    selectState?: undefined,
    options?: GetSelectorsOptions
  ): EntitySelectors<T, EntityState<T, Id>, Id>
  getSelectors<V>(
    selectState: (state: V) => EntityState<T, Id>,
    options?: GetSelectorsOptions
  ): EntitySelectors<T, V, Id>
}
