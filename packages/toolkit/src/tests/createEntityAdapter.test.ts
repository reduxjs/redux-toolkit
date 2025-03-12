import { createAction, createEntityAdapter, type EntityId } from '@reduxjs/toolkit'

describe('createEntityAdapter', () => {
  describe('CRUD operations', () => {
    describe('upsertMany', () => {
      type Entity = {
        id: EntityId
        value?: string
        value2?: number
      }

      const entity1 = { id: 1 }
      const entity2 = { id: 2 }
      const update1 = { id: 1, value: 'hello' }
      const update2 = { id: 1, value: 'world' }
      const update3 = { id: 1, value2: 42 }
      const adapter = createEntityAdapter<Entity>()
      const anyAction = createAction<Entity[]>('anyAction')
      const { selectAll } = adapter.getSelectors()

      describe('when adding new entities', () => {
        const initialState = adapter.setOne(adapter.getInitialState({}), entity1)
        const upsertAction = anyAction([entity2])

        it('should add a new entity to the state', () => {
          expect(selectAll(adapter.upsertMany(initialState, upsertAction))).toEqual([entity1, entity2])
        })
      })

      describe('when updating existing entities', () => {
        const initialState = adapter.setOne(adapter.getInitialState({}), entity1)
        const upsertAction = anyAction([update1, update2, update3])

        it('should update existing entity with multiple updates', () => {
          expect(selectAll(adapter.upsertMany(initialState, upsertAction))).toEqual([
            Object.assign({}, entity1, update1, update2, update3),
          ])
        })
      })

      describe('when applying updates to non-existing entities', () => {
        const initialState = adapter.getInitialState({})
        const upsertAction = anyAction([update1, update2, update3])

        it('should add the new entity and apply related updates', () => {
          expect(selectAll(adapter.upsertMany(initialState, upsertAction))).toEqual([
            Object.assign({}, update1, update2, update3),
          ])
        })
      })
    })
  })
})
