import type { Selector } from 'reselect'
import { createSelector } from 'reselect'
import type { EntitySelectors, EntityState } from '../models'
import type { BookModel } from './fixtures/book'

declare const selectors: EntitySelectors<
  BookModel,
  EntityState<BookModel, string>,
  string
>

describe('type tests', () => {
  it('should type single entity from Dictionary as entity type or undefined', () => {
    expectTypeOf(
      createSelector([selectors.selectEntities], (entities) => entities[0]),
    ).toMatchTypeOf<
      Selector<EntityState<BookModel, string>, BookModel | undefined>
    >()
  })
})
