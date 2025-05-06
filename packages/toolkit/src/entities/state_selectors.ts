import type { CreateSelectorFunction, Selector } from 'reselect'
import { createDraftSafeSelector } from '../createDraftSafeSelector'
import type {
  EntityState,
  EntitySelectors,
  EntityId,
  DefaultPlural,
} from './models'
import { capitalize } from './utils'

type AnyFunction = (...args: any) => any
type AnyCreateSelectorFunction = CreateSelectorFunction<
  <F extends AnyFunction>(f: F) => F,
  <F extends AnyFunction>(f: F) => F
>

export type GetSelectorsOptions<
  Single extends string = '',
  Plural extends string = DefaultPlural<''>,
> = {
  createSelector?: AnyCreateSelectorFunction
  name?: Single
  pluralName?: Plural
}

export function createSelectorsFactory<T, Id extends EntityId>() {
  function getSelectors<
    Single extends string = '',
    Plural extends string = DefaultPlural<Single>,
  >(
    selectState?: undefined,
    options?: GetSelectorsOptions<Single, Plural>,
  ): EntitySelectors<T, EntityState<T, Id>, Id, Single, Plural>
  function getSelectors<
    V,
    Single extends string = '',
    Plural extends string = DefaultPlural<Single>,
  >(
    selectState: (state: V) => EntityState<T, Id>,
    options?: GetSelectorsOptions<Single, Plural>,
  ): EntitySelectors<T, V, Id, Single, Plural>
  function getSelectors<
    V,
    Single extends string = '',
    Plural extends string = DefaultPlural<Single>,
  >(
    selectState?: (state: V) => EntityState<T, Id>,
    options: GetSelectorsOptions<Single, Plural> = {},
  ): EntitySelectors<T, any, Id, Single, Plural> {
    const {
      createSelector = createDraftSafeSelector as AnyCreateSelectorFunction,
      name = '',
      pluralName = name && `${name}s`,
    } = options

    const selectIds = (state: EntityState<T, Id>) => state.ids

    const selectEntities = (state: EntityState<T, Id>) => state.entities

    const selectAll = createSelector(
      selectIds,
      selectEntities,
      (ids, entities): T[] => ids.map((id) => entities[id]!),
    )

    const selectId = (_: unknown, id: Id) => id

    const selectById = (entities: Record<Id, T>, id: Id) => entities[id]

    const selectTotal = createSelector(selectIds, (ids) => ids.length)

    // template literal computed keys don't keep their type if there's an unresolved generic
    // so we cast to some intermediate type to at least check we're using the right variables in the right places

    const single = name as 's'
    const plural = pluralName as 'p'

    if (!selectState) {
      const selectors: EntitySelectors<T, any, Id, 's', 'p'> = {
        [`select${capitalize(single)}Ids` as const]: selectIds,
        [`select${capitalize(single)}Entities` as const]: selectEntities,
        [`selectAll${capitalize(plural)}` as const]: selectAll,
        [`selectTotal${capitalize(plural)}` as const]: selectTotal,
        [`select${capitalize(single)}ById` as const]: createSelector(
          selectEntities,
          selectId,
          selectById,
        ),
      }
      return selectors as any
    }

    const selectGlobalizedEntities = createSelector(
      selectState as Selector<V, EntityState<T, Id>>,
      selectEntities,
    )

    const selectors: EntitySelectors<T, any, Id, 's', 'p'> = {
      [`select${capitalize(single)}Ids` as const]: createSelector(
        selectState,
        selectIds,
      ),
      [`select${capitalize(single)}Entities` as const]:
        selectGlobalizedEntities,
      [`selectAll${capitalize(plural)}` as const]: createSelector(
        selectState,
        selectAll,
      ),
      [`selectTotal${capitalize(plural)}` as const]: createSelector(
        selectState,
        selectTotal,
      ),
      [`select${capitalize(single)}ById` as const]: createSelector(
        selectGlobalizedEntities,
        selectId,
        selectById,
      ),
    }
    return selectors as any
  }

  return { getSelectors }
}
