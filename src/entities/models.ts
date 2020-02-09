export type ComparerStr<T> = (a: T, b: T) => string
export type ComparerNum<T> = (a: T, b: T) => number

export type Comparer<T> = ComparerNum<T> | ComparerStr<T>

export type IdSelectorStr<T> = (model: T) => string
export type IdSelectorNum<T> = (model: T) => number

export type IdSelector<T> = IdSelectorStr<T> | IdSelectorNum<T>

export interface DictionaryNum<T> {
  [id: number]: T | undefined
}

export abstract class Dictionary<T> implements DictionaryNum<T> {
  [id: string]: T | undefined
}

export interface UpdateStr<T> {
  id: string
  changes: Partial<T>
}

export interface UpdateNum<T> {
  id: number
  changes: Partial<T>
}

export type Update<T> = UpdateStr<T> | UpdateNum<T>

export type Predicate<T> = (entity: T) => boolean

export type EntityMap<T> = (entity: T) => T

export interface EntityState<T> {
  ids: string[] | number[]
  entities: Dictionary<T>
}

export interface EntityDefinition<T> {
  selectId: IdSelector<T>
  sortComparer: false | Comparer<T>
}

export interface EntityStateAdapter<T> {
  addOne<S extends EntityState<T>>(entity: T, state: S): S
  addMany<S extends EntityState<T>>(entities: T[], state: S): S

  setAll<S extends EntityState<T>>(entities: T[], state: S): S

  removeOne<S extends EntityState<T>>(key: string, state: S): S
  removeOne<S extends EntityState<T>>(key: number, state: S): S

  removeMany<S extends EntityState<T>>(keys: string[], state: S): S
  removeMany<S extends EntityState<T>>(keys: number[], state: S): S
  removeMany<S extends EntityState<T>>(predicate: Predicate<T>, state: S): S

  removeAll<S extends EntityState<T>>(state: S): S

  updateOne<S extends EntityState<T>>(update: Update<T>, state: S): S
  updateMany<S extends EntityState<T>>(updates: Update<T>[], state: S): S

  upsertOne<S extends EntityState<T>>(entity: T, state: S): S
  upsertMany<S extends EntityState<T>>(entities: T[], state: S): S

  map<S extends EntityState<T>>(map: EntityMap<T>, state: S): S
}

export interface EntitySelectors<T, V> {
  selectIds: (state: V) => string[] | number[]
  selectEntities: (state: V) => Dictionary<T>
  selectAll: (state: V) => T[]
  selectTotal: (state: V) => number
}

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
