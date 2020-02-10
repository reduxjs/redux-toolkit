import { EntityStateAdapter, EntityState } from './models'
import { createEntityAdapter } from './create_adapter'
import {
  BookModel,
  TheGreatGatsby,
  AClockworkOrange,
  AnimalFarm
} from './fixtures/book'

describe('Unsorted State Adapter', () => {
  let adapter: EntityStateAdapter<BookModel>
  let state: EntityState<BookModel>

  beforeAll(() => {
    Object.defineProperty(Array.prototype, 'unwantedField', {
      enumerable: true,
      configurable: true,
      value: 'This should not appear anywhere'
    })
  })

  afterAll(() => {
    delete (Array.prototype as any).unwantedField
  })

  beforeEach(() => {
    adapter = createEntityAdapter({
      selectId: (book: BookModel) => book.id
    })

    state = { ids: [], entities: {} }
  })

  it('should let you add one entity to the state', () => {
    const withOneEntity = adapter.addOne(TheGreatGatsby, state)

    expect(withOneEntity).toEqual({
      ids: [TheGreatGatsby.id],
      entities: {
        [TheGreatGatsby.id]: TheGreatGatsby
      }
    })
  })

  it('should not change state if you attempt to re-add an entity', () => {
    const withOneEntity = adapter.addOne(TheGreatGatsby, state)

    const readded = adapter.addOne(TheGreatGatsby, withOneEntity)

    expect(readded).toBe(withOneEntity)
  })

  it('should let you add many entities to the state', () => {
    const withOneEntity = adapter.addOne(TheGreatGatsby, state)

    const withManyMore = adapter.addMany(
      [AClockworkOrange, AnimalFarm],
      withOneEntity
    )

    expect(withManyMore).toEqual({
      ids: [TheGreatGatsby.id, AClockworkOrange.id, AnimalFarm.id],
      entities: {
        [TheGreatGatsby.id]: TheGreatGatsby,
        [AClockworkOrange.id]: AClockworkOrange,
        [AnimalFarm.id]: AnimalFarm
      }
    })
  })

  it('should remove existing and add new ones on setAll', () => {
    const withOneEntity = adapter.addOne(TheGreatGatsby, state)

    const withAll = adapter.setAll(
      [AClockworkOrange, AnimalFarm],
      withOneEntity
    )

    expect(withAll).toEqual({
      ids: [AClockworkOrange.id, AnimalFarm.id],
      entities: {
        [AClockworkOrange.id]: AClockworkOrange,
        [AnimalFarm.id]: AnimalFarm
      }
    })
  })

  it('should let you add remove an entity from the state', () => {
    const withOneEntity = adapter.addOne(TheGreatGatsby, state)

    const withoutOne = adapter.removeOne(TheGreatGatsby.id, state)

    expect(withoutOne).toEqual({
      ids: [],
      entities: {}
    })
  })

  it('should let you remove many entities by id from the state', () => {
    const withAll = adapter.setAll(
      [TheGreatGatsby, AClockworkOrange, AnimalFarm],
      state
    )

    const withoutMany = adapter.removeMany(
      [TheGreatGatsby.id, AClockworkOrange.id],
      withAll
    )

    expect(withoutMany).toEqual({
      ids: [AnimalFarm.id],
      entities: {
        [AnimalFarm.id]: AnimalFarm
      }
    })
  })

  it('should let you remove many entities by a predicate from the state', () => {
    const withAll = adapter.setAll(
      [TheGreatGatsby, AClockworkOrange, AnimalFarm],
      state
    )

    const withoutMany = adapter.removeMany(p => p.id.startsWith('a'), withAll)

    expect(withoutMany).toEqual({
      ids: [TheGreatGatsby.id],
      entities: {
        [TheGreatGatsby.id]: TheGreatGatsby
      }
    })
  })

  it('should let you remove all entities from the state', () => {
    const withAll = adapter.setAll(
      [TheGreatGatsby, AClockworkOrange, AnimalFarm],
      state
    )

    const withoutAll = adapter.removeAll(withAll)

    expect(withoutAll).toEqual({
      ids: [],
      entities: {}
    })
  })

  it('should let you update an entity in the state', () => {
    const withOne = adapter.addOne(TheGreatGatsby, state)
    const changes = { title: 'A New Hope' }

    const withUpdates = adapter.updateOne(
      {
        id: TheGreatGatsby.id,
        changes
      },
      withOne
    )

    expect(withUpdates).toEqual({
      ids: [TheGreatGatsby.id],
      entities: {
        [TheGreatGatsby.id]: {
          ...TheGreatGatsby,
          ...changes
        }
      }
    })
  })

  it('should not change state if you attempt to update an entity that has not been added', () => {
    const withUpdates = adapter.updateOne(
      {
        id: TheGreatGatsby.id,
        changes: { title: 'A New Title' }
      },
      state
    )

    expect(withUpdates).toBe(state)
  })

  it('should not change ids state if you attempt to update an entity that has already been added', () => {
    const withOne = adapter.addOne(TheGreatGatsby, state)
    const changes = { title: 'A New Hope' }

    const withUpdates = adapter.updateOne(
      {
        id: TheGreatGatsby.id,
        changes
      },
      withOne
    )

    expect(withOne.ids).toBe(withUpdates.ids)
  })

  it('should let you update the id of entity', () => {
    const withOne = adapter.addOne(TheGreatGatsby, state)
    const changes = { id: 'A New Id' }

    const withUpdates = adapter.updateOne(
      {
        id: TheGreatGatsby.id,
        changes
      },
      withOne
    )

    expect(withUpdates).toEqual({
      ids: [changes.id],
      entities: {
        [changes.id]: {
          ...TheGreatGatsby,
          ...changes
        }
      }
    })
  })

  it('should let you update many entities by id in the state', () => {
    const firstChange = { title: 'First Change' }
    const secondChange = { title: 'Second Change' }
    const withMany = adapter.setAll([TheGreatGatsby, AClockworkOrange], state)

    const withUpdates = adapter.updateMany(
      [
        { id: TheGreatGatsby.id, changes: firstChange },
        { id: AClockworkOrange.id, changes: secondChange }
      ],
      withMany
    )

    expect(withUpdates).toEqual({
      ids: [TheGreatGatsby.id, AClockworkOrange.id],
      entities: {
        [TheGreatGatsby.id]: {
          ...TheGreatGatsby,
          ...firstChange
        },
        [AClockworkOrange.id]: {
          ...AClockworkOrange,
          ...secondChange
        }
      }
    })
  })

  it('should let you map over entities in the state', () => {
    const firstChange = { ...TheGreatGatsby, title: 'First change' }
    const secondChange = { ...AClockworkOrange, title: 'Second change' }

    const withMany = adapter.setAll(
      [TheGreatGatsby, AClockworkOrange, AnimalFarm],
      state
    )

    const withUpdates = adapter.map(
      book =>
        book.title === TheGreatGatsby.title
          ? firstChange
          : book.title === AClockworkOrange.title
          ? secondChange
          : book,
      withMany
    )

    expect(withUpdates).toEqual({
      ids: [TheGreatGatsby.id, AClockworkOrange.id, AnimalFarm.id],
      entities: {
        [TheGreatGatsby.id]: {
          ...TheGreatGatsby,
          ...firstChange
        },
        [AClockworkOrange.id]: {
          ...AClockworkOrange,
          ...secondChange
        },
        [AnimalFarm.id]: AnimalFarm
      }
    })
  })

  it('should let you add one entity to the state with upsert()', () => {
    const withOneEntity = adapter.upsertOne(TheGreatGatsby, state)
    expect(withOneEntity).toEqual({
      ids: [TheGreatGatsby.id],
      entities: {
        [TheGreatGatsby.id]: TheGreatGatsby
      }
    })
  })

  it('should let you update an entity in the state with upsert()', () => {
    const withOne = adapter.addOne(TheGreatGatsby, state)
    const changes = { title: 'A New Hope' }

    const withUpdates = adapter.upsertOne(
      { ...TheGreatGatsby, ...changes },
      withOne
    )
    expect(withUpdates).toEqual({
      ids: [TheGreatGatsby.id],
      entities: {
        [TheGreatGatsby.id]: {
          ...TheGreatGatsby,
          ...changes
        }
      }
    })
  })

  it('should let you upsert many entities in the state', () => {
    const firstChange = { title: 'First Change' }
    const withMany = adapter.setAll([TheGreatGatsby], state)

    const withUpserts = adapter.upsertMany(
      [{ ...TheGreatGatsby, ...firstChange }, AClockworkOrange],
      withMany
    )

    expect(withUpserts).toEqual({
      ids: [TheGreatGatsby.id, AClockworkOrange.id],
      entities: {
        [TheGreatGatsby.id]: {
          ...TheGreatGatsby,
          ...firstChange
        },
        [AClockworkOrange.id]: AClockworkOrange
      }
    })
  })
})
