import type {
  EntityAdapter,
  ActionCreatorWithPayload,
  ActionCreatorWithoutPayload,
  EntityStateAdapter,
  EntityId,
  Update,
} from '@reduxjs/toolkit'
import { createSlice, createEntityAdapter } from '@reduxjs/toolkit'
import { expectType } from './helpers'

function extractReducers<T, Id extends EntityId>(
  adapter: EntityAdapter<T, Id>
): Omit<EntityStateAdapter<T, Id>, 'map'> {
  const { selectId, sortComparer, getInitialState, getSelectors, ...rest } =
    adapter
  return rest
}

/**
 * should be usable in a slice, with all the "reducer-like" functions
 */
{
  type Id = string & { readonly __tag: unique symbol }
  type Entity = {
    id: Id
  }
  const adapter = createEntityAdapter<Entity>()
  const slice = createSlice({
    name: 'test',
    initialState: adapter.getInitialState(),
    reducers: {
      ...extractReducers(adapter),
    },
  })

  expectType<ActionCreatorWithPayload<Entity>>(slice.actions.addOne)
  expectType<
    ActionCreatorWithPayload<ReadonlyArray<Entity> | Record<string, Entity>>
  >(slice.actions.addMany)
  expectType<
    ActionCreatorWithPayload<ReadonlyArray<Entity> | Record<string, Entity>>
  >(slice.actions.setAll)
  expectType<ActionCreatorWithPayload<Entity[] | Record<string, Entity>>>(
    // @ts-expect-error
    slice.actions.addMany
  )
  expectType<ActionCreatorWithPayload<Entity[] | Record<string, Entity>>>(
    // @ts-expect-error
    slice.actions.setAll
  )
  expectType<ActionCreatorWithPayload<Id>>(slice.actions.removeOne)
  expectType<ActionCreatorWithPayload<ReadonlyArray<Id>>>(
    slice.actions.removeMany
  )
  // @ts-expect-error
  expectType<ActionCreatorWithPayload<EntityId[]>>(slice.actions.removeMany)
  expectType<ActionCreatorWithoutPayload>(slice.actions.removeAll)
  expectType<ActionCreatorWithPayload<Update<Entity, Id>>>(
    slice.actions.updateOne
  )
  expectType<ActionCreatorWithPayload<Update<Entity, Id>[]>>(
    // @ts-expect-error
    slice.actions.updateMany
  )
  expectType<ActionCreatorWithPayload<ReadonlyArray<Update<Entity, Id>>>>(
    slice.actions.updateMany
  )
  expectType<ActionCreatorWithPayload<Entity>>(slice.actions.upsertOne)
  expectType<
    ActionCreatorWithPayload<ReadonlyArray<Entity> | Record<string, Entity>>
  >(slice.actions.upsertMany)
  expectType<ActionCreatorWithPayload<Entity[] | Record<string, Entity>>>(
    // @ts-expect-error
    slice.actions.upsertMany
  )
}

/**
 * should not be able to mix with a different EntityAdapter
 */
{
  type Entity = {
    id: EntityId
    value: string
  }
  type Entity2 = {
    id: EntityId
    value2: string
  }
  const adapter = createEntityAdapter<Entity>()
  const adapter2 = createEntityAdapter<Entity2>()
  createSlice({
    name: 'test',
    initialState: adapter.getInitialState(),
    reducers: {
      addOne: adapter.addOne,
      // @ts-expect-error
      addOne2: adapter2.addOne,
    },
  })
}

/**
 * should be usable in a slice with extra properties
 */
{
  type Entity = { id: EntityId; value: string }
  const adapter = createEntityAdapter<Entity>()
  createSlice({
    name: 'test',
    initialState: adapter.getInitialState({ extraData: 'test' }),
    reducers: {
      addOne: adapter.addOne,
    },
  })
}

/**
 * should not be usable in a slice with an unfitting state
 */
{
  type Entity = { id: EntityId; value: string }
  const adapter = createEntityAdapter<Entity>()
  createSlice({
    name: 'test',
    initialState: { somethingElse: '' },
    reducers: {
      // @ts-expect-error
      addOne: adapter.addOne,
    },
  })
}

/**
 * should not be able to create an adapter unless the type has an Id
 * or an idSelector is provided
 */
{
  type Entity = {
    value: string
  }
  // @ts-expect-error
  const adapter = createEntityAdapter<Entity>()
  const adapter2: EntityAdapter<Entity, Entity['value']> = createEntityAdapter({
    selectId: (e: Entity) => e.value,
  })
}
