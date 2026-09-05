import type { PayloadAction } from '../createAction'
import type { Draft } from '../immerImports'
import type { CastAny, Id } from '../tsHelpers'
import type { UncheckedIndexedAccess } from '../uncheckedindexed.js'
import type { GetSelectorsOptions } from './state_selectors'

/**
 * @public
 */
export type EntityId = number | string

/**
 * @public
 */
export type Comparer<EntityType> = (a: EntityType, b: EntityType) => number

/**
 * @public
 */
export type IdSelector<EntityType, EntityIdType extends EntityId> = (
  model: EntityType,
) => EntityIdType

/**
 * @public
 */
export type Update<EntityType, EntityIdType extends EntityId> = {
  id: EntityIdType
  changes: Partial<EntityType>
}

/**
 * @public
 */
export interface EntityState<EntityType, EntityIdType extends EntityId> {
  ids: EntityIdType[]
  entities: Record<EntityIdType, EntityType>
}

/**
 * @public
 */
export interface EntityAdapterOptions<
  EntityType,
  EntityIdType extends EntityId,
> {
  selectId?: IdSelector<EntityType, EntityIdType>
  sortComparer?: false | Comparer<EntityType>
}

export type PreventAny<
  StateType,
  EntityType,
  EntityIdType extends EntityId,
> = CastAny<StateType, EntityState<EntityType, EntityIdType>>

export type DraftableEntityState<EntityType, EntityIdType extends EntityId> =
  | EntityState<EntityType, EntityIdType>
  | Draft<EntityState<EntityType, EntityIdType>>

/**
 * @public
 */
export interface EntityStateAdapter<EntityType, EntityIdType extends EntityId> {
  addOne<StateType extends DraftableEntityState<EntityType, EntityIdType>>(
    state: PreventAny<StateType, EntityType, EntityIdType>,
    entity: EntityType,
  ): StateType
  addOne<StateType extends DraftableEntityState<EntityType, EntityIdType>>(
    state: PreventAny<StateType, EntityType, EntityIdType>,
    action: PayloadAction<EntityType>,
  ): StateType

  addMany<StateType extends DraftableEntityState<EntityType, EntityIdType>>(
    state: PreventAny<StateType, EntityType, EntityIdType>,
    entities: readonly EntityType[] | Record<EntityIdType, EntityType>,
  ): StateType
  addMany<StateType extends DraftableEntityState<EntityType, EntityIdType>>(
    state: PreventAny<StateType, EntityType, EntityIdType>,
    entities: PayloadAction<
      readonly EntityType[] | Record<EntityIdType, EntityType>
    >,
  ): StateType

  setOne<StateType extends DraftableEntityState<EntityType, EntityIdType>>(
    state: PreventAny<StateType, EntityType, EntityIdType>,
    entity: EntityType,
  ): StateType
  setOne<StateType extends DraftableEntityState<EntityType, EntityIdType>>(
    state: PreventAny<StateType, EntityType, EntityIdType>,
    action: PayloadAction<EntityType>,
  ): StateType

  setMany<StateType extends DraftableEntityState<EntityType, EntityIdType>>(
    state: PreventAny<StateType, EntityType, EntityIdType>,
    entities: readonly EntityType[] | Record<EntityIdType, EntityType>,
  ): StateType
  setMany<StateType extends DraftableEntityState<EntityType, EntityIdType>>(
    state: PreventAny<StateType, EntityType, EntityIdType>,
    entities: PayloadAction<
      readonly EntityType[] | Record<EntityIdType, EntityType>
    >,
  ): StateType

  setAll<StateType extends DraftableEntityState<EntityType, EntityIdType>>(
    state: PreventAny<StateType, EntityType, EntityIdType>,
    entities: readonly EntityType[] | Record<EntityIdType, EntityType>,
  ): StateType
  setAll<StateType extends DraftableEntityState<EntityType, EntityIdType>>(
    state: PreventAny<StateType, EntityType, EntityIdType>,
    entities: PayloadAction<
      readonly EntityType[] | Record<EntityIdType, EntityType>
    >,
  ): StateType

  removeOne<StateType extends DraftableEntityState<EntityType, EntityIdType>>(
    state: PreventAny<StateType, EntityType, EntityIdType>,
    key: EntityIdType,
  ): StateType
  removeOne<StateType extends DraftableEntityState<EntityType, EntityIdType>>(
    state: PreventAny<StateType, EntityType, EntityIdType>,
    key: PayloadAction<EntityIdType>,
  ): StateType

  removeMany<StateType extends DraftableEntityState<EntityType, EntityIdType>>(
    state: PreventAny<StateType, EntityType, EntityIdType>,
    keys: readonly EntityIdType[],
  ): StateType
  removeMany<StateType extends DraftableEntityState<EntityType, EntityIdType>>(
    state: PreventAny<StateType, EntityType, EntityIdType>,
    keys: PayloadAction<readonly EntityIdType[]>,
  ): StateType

  removeAll<StateType extends DraftableEntityState<EntityType, EntityIdType>>(
    state: PreventAny<StateType, EntityType, EntityIdType>,
  ): StateType

  updateOne<StateType extends DraftableEntityState<EntityType, EntityIdType>>(
    state: PreventAny<StateType, EntityType, EntityIdType>,
    update: Update<EntityType, EntityIdType>,
  ): StateType
  updateOne<StateType extends DraftableEntityState<EntityType, EntityIdType>>(
    state: PreventAny<StateType, EntityType, EntityIdType>,
    update: PayloadAction<Update<EntityType, EntityIdType>>,
  ): StateType

  updateMany<StateType extends DraftableEntityState<EntityType, EntityIdType>>(
    state: PreventAny<StateType, EntityType, EntityIdType>,
    updates: ReadonlyArray<Update<EntityType, EntityIdType>>,
  ): StateType
  updateMany<StateType extends DraftableEntityState<EntityType, EntityIdType>>(
    state: PreventAny<StateType, EntityType, EntityIdType>,
    updates: PayloadAction<ReadonlyArray<Update<EntityType, EntityIdType>>>,
  ): StateType

  upsertOne<StateType extends DraftableEntityState<EntityType, EntityIdType>>(
    state: PreventAny<StateType, EntityType, EntityIdType>,
    entity: EntityType,
  ): StateType
  upsertOne<StateType extends DraftableEntityState<EntityType, EntityIdType>>(
    state: PreventAny<StateType, EntityType, EntityIdType>,
    entity: PayloadAction<EntityType>,
  ): StateType

  upsertMany<StateType extends DraftableEntityState<EntityType, EntityIdType>>(
    state: PreventAny<StateType, EntityType, EntityIdType>,
    entities: readonly EntityType[] | Record<EntityIdType, EntityType>,
  ): StateType
  upsertMany<StateType extends DraftableEntityState<EntityType, EntityIdType>>(
    state: PreventAny<StateType, EntityType, EntityIdType>,
    entities: PayloadAction<
      readonly EntityType[] | Record<EntityIdType, EntityType>
    >,
  ): StateType
}

/**
 * @public
 */
export interface EntitySelectors<
  EntityType,
  StateType,
  EntityIdType extends EntityId,
> {
  selectIds: (state: StateType) => EntityIdType[]
  selectEntities: (state: StateType) => Record<EntityIdType, EntityType>
  selectAll: (state: StateType) => EntityType[]
  selectTotal: (state: StateType) => number
  selectById: (
    state: StateType,
    id: EntityIdType,
  ) => Id<UncheckedIndexedAccess<EntityType>>
}

/**
 * @public
 */
export interface EntityStateFactory<EntityType, EntityIdType extends EntityId> {
  getInitialState(
    state?: undefined,
    entities?: Record<EntityIdType, EntityType> | readonly EntityType[],
  ): EntityState<EntityType, EntityIdType>
  getInitialState<StateType extends object>(
    state: StateType,
    entities?: Record<EntityIdType, EntityType> | readonly EntityType[],
  ): EntityState<EntityType, EntityIdType> & StateType
}

/**
 * @public
 */
export interface EntityAdapter<EntityType, EntityIdType extends EntityId>
  extends
    EntityStateAdapter<EntityType, EntityIdType>,
    EntityStateFactory<EntityType, EntityIdType>,
    Required<EntityAdapterOptions<EntityType, EntityIdType>> {
  getSelectors(
    selectState?: undefined,
    options?: GetSelectorsOptions,
  ): EntitySelectors<
    EntityType,
    EntityState<EntityType, EntityIdType>,
    EntityIdType
  >
  getSelectors<StateType>(
    selectState: (state: StateType) => EntityState<EntityType, EntityIdType>,
    options?: GetSelectorsOptions,
  ): EntitySelectors<EntityType, StateType, EntityIdType>
}
