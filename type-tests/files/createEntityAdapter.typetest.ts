import {
  createSlice,
  createEntityAdapter,
  EntityAdapter,
  ActionCreatorWithPayload,
  ActionCreatorWithoutPayload,
  EntityStateAdapter,
  EntityId,
  Update
} from '@reduxjs/toolkit'
import { expectType } from './helpers'

type SpecificEntityId = 1 | 3 | 'five'

function extractReducers<T, Id extends EntityId>(
  adapter: EntityAdapter<T, Id>
): Omit<EntityStateAdapter<T, Id>, 'map'> {
  const {
    selectId,
    sortComparer,
    getInitialState,
    getSelectors,
    ...rest
  } = adapter
  return rest
}

/**
 * should be usable in a slice, with all the "reducer-like" functions
 */
{
  type Entity = {
    id: SpecificEntityId
    value: string
  }
  const adapter = createEntityAdapter<Entity>()
  const slice = createSlice({
    name: 'test',
    initialState: adapter.getInitialState(),
    reducers: {
      ...extractReducers(adapter)
    }
  })

  expectType<ActionCreatorWithPayload<Entity>>(slice.actions.addOne)
  expectType<
    ActionCreatorWithPayload<Entity[] | Record<SpecificEntityId, Entity>>
  >(slice.actions.addMany)
  expectType<
    ActionCreatorWithPayload<Entity[] | Record<SpecificEntityId, Entity>>
  >(slice.actions.setAll)
  expectType<ActionCreatorWithPayload<SpecificEntityId>>(
    slice.actions.removeOne
  )
  expectType<ActionCreatorWithPayload<SpecificEntityId[]>>(
    slice.actions.removeMany
  )
  expectType<ActionCreatorWithoutPayload>(slice.actions.removeAll)
  expectType<ActionCreatorWithPayload<Update<Entity, SpecificEntityId>>>(
    slice.actions.updateOne
  )
  expectType<ActionCreatorWithPayload<Update<Entity, SpecificEntityId>[]>>(
    slice.actions.updateMany
  )
  expectType<ActionCreatorWithPayload<Entity>>(slice.actions.upsertOne)
  expectType<ActionCreatorWithPayload<Entity[] | Record<string, Entity>>>(
    slice.actions.upsertMany
  )
}

/**
 * should not be able to mix with a different EntityAdapter
 */
{
  type Entity = {
    id: string
    value: string
  }
  type Entity2 = {
    id: string
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
      addOne2: adapter2.addOne
    }
  })
}

/**
 * should be usable in a slice with extra properties
 */
{
  type Entity = {
    id: SpecificEntityId
    value: string
  }
  const adapter = createEntityAdapter<Entity>()
  createSlice({
    name: 'test',
    initialState: adapter.getInitialState({ extraData: 'test' }),
    reducers: {
      addOne: adapter.addOne
    }
  })
}

/**
 * should not be usable in a slice with an unfitting state
 */
{
  type Entity = {
    id: SpecificEntityId
    value: string
  }
  const adapter = createEntityAdapter<Entity>()
  createSlice({
    name: 'test',
    initialState: { somethingElse: '' },
    reducers: {
      // @ts-expect-error
      addOne: adapter.addOne
    }
  })
}
