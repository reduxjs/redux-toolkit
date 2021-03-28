import { bisect, numberCmp, Index, Indexer, Keyer } from './indexers'

declare function require(m: string): any
var assert = require('assert')

function attributeKeyer<O>(...k: (keyof O)[]): Keyer<O> {
  return function(o: O) {
    return k.map(a => o[a])
  }
}

interface Cup {
  size: number
  color: string
  id: number
}

type CupIndexes = {
  byColorAndSize: Index<Cup>
  bySize: Index<Cup>
  byId: Index<Cup>
  bySizeOfColorBiggest: Index<Cup>
}

let indexer = new Indexer<Cup, CupIndexes>('byId')
indexer.addIndex('byId', attributeKeyer<Cup>('id'))
indexer.addIndex('byColorAndSize', attributeKeyer<Cup>('color', 'size'))
indexer.addIndex('bySize', attributeKeyer<Cup>('size'))
indexer.addGroupedIndex(
  'bySizeOfColorBiggest',
  attributeKeyer<Cup>('size'),
  'byColorAndSize',
  attributeKeyer<Cup>('color'),
  (iter, reverseIter) => {
    return reverseIter()
  }
)

let lastCupId = 0
const firstCup = { size: 0, color: 'a', id: lastCupId } as Cup

function largeCupThan(cup: Cup) {
  return { ...cup, id: ++lastCupId, size: cup.size + 1 }
}

function shrinkCup(cup: Cup) {
  return { ...cup, size: cup.size - 1 }
}

function shareColorWith(cup: Cup, cup2: Cup) {
  return { ...cup, color: cup2.color }
}

function smallerCupThan(cup: Cup) {
  return { ...cup, id: ++lastCupId, size: cup.size - 1 }
}

function differentColorThan(cup: Cup) {
  return { ...cup, id: ++lastCupId, color: cup.color + 'a' }
}

function similarCup(cup: Cup) {
  return { ...cup, id: ++lastCupId }
}

function accumulate(index: Index<Cup>) {
  let result = [] as Cup[]
  let iterator = Indexer.iterator(index)
  for (let v = iterator(); v; v = iterator()) {
    result.push(v)
  }
  return result
}

function reverseAccumulate(
  index: Index<Cup>,
  startKey?: any[],
  endKey?: any[]
): Cup[] {
  let result = [] as Cup[]
  let iterator = Indexer.reverseIter(index, startKey, endKey)
  for (let v = iterator(); v; v = iterator()) {
    result.push(v)
  }
  return result
}

let indexes: CupIndexes
let previousIndexes: CupIndexes | undefined

function assertReferenceChanges(newIndexes: CupIndexes) {
  assert.notStrictEqual(newIndexes, indexes, 'reference should change')
  previousIndexes = indexes
  indexes = newIndexes
  return indexes
}

function assertReferenceDoesNotChange(newStore: CupIndexes) {
  assert.strictEqual(newStore, indexes, 'reference should not change')
  return indexes
}

describe('Indexers', () => {
  beforeEach(() => {
    indexes = indexer.empty()
    previousIndexes = undefined
  })

  test('bisect finds the correct insert index', () => {
    const ids = [1, 4, 9, 12, 27]

    function subject(targetNumber: number) {
      return bisect(ids, targetNumber, numberCmp)
    }

    assert.equal(subject(11), 3)
    assert.equal(subject(3), 1)
    assert.equal(subject(-1), 0)
    assert.equal(subject(100), 5)
  })

  test('add / remove', () => {
    assertReferenceDoesNotChange(indexer.removeByPk(indexes, [12]))

    const cup1 = firstCup
    const cup2 = differentColorThan(largeCupThan(cup1))
    const cup3 = smallerCupThan(similarCup(cup2))
    const cup4 = largeCupThan(largeCupThan(cup1))
    const cup5 = largeCupThan(largeCupThan(cup3))
    const overwrittenCup3 = { ...cup3 }
    overwrittenCup3.size = 5000

    assertReferenceChanges(indexer.update(indexes, [cup2]))
    assert.notStrictEqual(
      indexes.bySizeOfColorBiggest,
      previousIndexes!.bySizeOfColorBiggest
    )

    assertReferenceChanges(indexer.update(indexes, [cup1]))
    assert.notStrictEqual(
      indexes.bySizeOfColorBiggest,
      previousIndexes!.bySizeOfColorBiggest
    )

    assertReferenceChanges(indexer.update(indexes, [cup4]))
    assert.notStrictEqual(
      indexes.bySizeOfColorBiggest,
      previousIndexes!.bySizeOfColorBiggest
    )

    assertReferenceChanges(indexer.update(indexes, [overwrittenCup3, cup3]))
    assert.strictEqual(
      indexes.bySizeOfColorBiggest,
      previousIndexes!.bySizeOfColorBiggest
    )

    let loaded = indexes

    assertReferenceDoesNotChange(indexer.removeByPk(indexes, [cup5.id]))

    assert.deepEqual(
      accumulate(indexes.byId),
      [cup1, cup2, cup3, cup4],
      'keeps cups organized by id'
    )
    assert.deepEqual(
      accumulate(indexes.byColorAndSize),
      [cup1, cup4, cup3, cup2],
      'keeps cups organized by color and size'
    )
    assert.deepEqual(
      accumulate(indexes.bySize),
      [cup1, cup3, cup2, cup4],
      'keeps cups organized by size'
    )
    assert.deepEqual(
      accumulate(indexes.bySizeOfColorBiggest),
      [cup2, cup4],
      'keeps cups organized by size of per color biggest'
    )

    assert.strictEqual(
      indexes.bySizeOfColorBiggest,
      previousIndexes!.bySizeOfColorBiggest
    )

    assertReferenceChanges(indexer.removeByPk(indexes, [cup2.id]))
    assert.deepEqual(
      accumulate(indexes.byId),
      [cup1, cup3, cup4],
      'keeps cups organize by id'
    )
    assert.deepEqual(
      accumulate(indexes.byColorAndSize),
      [cup1, cup4, cup3],
      'keeps cups organized by color and size'
    )
    assert.deepEqual(
      accumulate(indexes.bySize),
      [cup1, cup3, cup4],
      'keeps cups organized by size'
    )
    assert.deepEqual(
      accumulate(indexes.bySizeOfColorBiggest),
      [cup3, cup4],
      'keeps cups organized by size of per color biggest'
    )
    assert.notStrictEqual(
      indexes.bySizeOfColorBiggest,
      previousIndexes!.bySizeOfColorBiggest
    )

    assertReferenceChanges(indexer.removeByPk(indexes, [cup1.id]))
    assert.deepEqual(
      accumulate(indexes.byId),
      [cup3, cup4],
      'keeps cups organized by id'
    )
    assert.deepEqual(
      accumulate(indexes.byColorAndSize),
      [cup4, cup3],
      'keeps cups organized by color and size'
    )
    assert.deepEqual(
      accumulate(indexes.bySize),
      [cup3, cup4],
      'keeps cups organized by size'
    )
    assert.deepEqual(
      accumulate(indexes.bySizeOfColorBiggest),
      [cup3, cup4],
      'keeps cups organized by size of per color biggest'
    )
    assert.strictEqual(
      indexes.bySizeOfColorBiggest,
      previousIndexes!.bySizeOfColorBiggest
    )

    assertReferenceDoesNotChange(indexer.removeByPk(indexes, [cup1.id]))
    assert.deepEqual(
      accumulate(indexes.byId),
      [cup3, cup4],
      'keeps cups organized by id'
    )
    assert.deepEqual(
      accumulate(indexes.byColorAndSize),
      [cup4, cup3],
      'keeps cups organized by color and size'
    )
    assert.deepEqual(
      accumulate(indexes.bySize),
      [cup3, cup4],
      'keeps cups organized by size'
    )
    assert.deepEqual(
      accumulate(indexes.bySizeOfColorBiggest),
      [cup3, cup4],
      'keeps cups organized by size of per color biggest'
    )
    assert.strictEqual(
      indexes.bySizeOfColorBiggest,
      previousIndexes!.bySizeOfColorBiggest
    )

    assertReferenceChanges(indexer.removeByPk(indexes, [cup3.id]))
    assert.deepEqual(
      accumulate(indexes.byId),
      [cup4],
      'keeps cups organized by id'
    )
    assert.deepEqual(
      accumulate(indexes.byColorAndSize),
      [cup4],
      'keeps cups organized by color and size'
    )
    assert.deepEqual(
      accumulate(indexes.bySize),
      [cup4],
      'keeps cups organized by size'
    )
    assert.deepEqual(
      accumulate(indexes.bySizeOfColorBiggest),
      [cup4],
      'keeps cups organized by size of per color biggest'
    )
    assert.notStrictEqual(
      indexes.bySizeOfColorBiggest,
      previousIndexes!.bySizeOfColorBiggest
    )

    assertReferenceChanges(indexer.removeByPk(indexes, [cup4.id]))
    assert.deepEqual(accumulate(indexes.byId), [], 'keeps cups organized by id')
    assert.deepEqual(
      accumulate(indexes.byColorAndSize),
      [],
      'keeps cups organized by color and size'
    )
    assert.deepEqual(
      accumulate(indexes.bySize),
      [],
      'keeps cups organized by size'
    )
    assert.deepEqual(
      accumulate(indexes.bySizeOfColorBiggest),
      [],
      'keeps cups organized by size of per color biggest'
    )
    assert.notStrictEqual(
      indexes.bySizeOfColorBiggest,
      previousIndexes!.bySizeOfColorBiggest
    )

    indexes = loaded
    assertReferenceChanges(
      indexer.removeAll(indexes, [cup5, cup1, cup2, cup1, cup2])
    )
    assert.deepEqual(
      accumulate(indexes.byId),
      [cup3, cup4],
      'keeps cups organized by id'
    )
    assert.deepEqual(
      accumulate(indexes.byColorAndSize),
      [cup4, cup3],
      'keeps cups organized by color and size'
    )
    assert.deepEqual(
      accumulate(indexes.bySize),
      [cup3, cup4],
      'keeps cups organized by size'
    )
    assert.deepEqual(
      accumulate(indexes.bySizeOfColorBiggest),
      [cup3, cup4],
      'keeps cups organized by size of per color biggest'
    )
  })

  test('update managing indexes', () => {
    let cup1 = firstCup
    let cup2 = differentColorThan(cup1)
    let cup3 = differentColorThan(cup1)

    let cup4 = largeCupThan(cup1)
    let cup5 = smallerCupThan(cup2)
    let cup6 = largeCupThan(cup3)
    let cup7 = largeCupThan(cup6)

    let unusedCup2 = shrinkCup(cup2)
    let unusedCup22 = shrinkCup(unusedCup2)
    let unusedCup5 = { ...cup5 }
    unusedCup5.size = 9999

    assertReferenceChanges(
      indexer.update(indexes, [
        unusedCup2,
        cup6,
        unusedCup22,
        cup4,
        cup2,
        cup3,
        cup5,
        unusedCup5,
        cup5,
        cup7,
        cup3,
        cup1
      ])
    )

    assert.deepEqual(accumulate(indexes.byId), [
      cup1,
      cup2,
      cup3,
      cup4,
      cup5,
      cup6,
      cup7
    ])
    assert.deepEqual(accumulate(indexes.byColorAndSize), [
      cup1,
      cup4,
      cup5,
      cup2,
      cup3,
      cup6,
      cup7
    ])
    assert.deepEqual(accumulate(indexes.bySize), [
      cup5,
      cup1,
      cup2,
      cup3,
      cup4,
      cup6,
      cup7
    ])

    let oldCup4 = cup4
    cup4 = shrinkCup(shrinkCup(cup4))
    assertReferenceChanges(indexer.update(indexes, [oldCup4, cup4]))
    assert.deepEqual(accumulate(indexes.byId), [
      cup1,
      cup2,
      cup3,
      cup4,
      cup5,
      cup6,
      cup7
    ])
    assert.deepEqual(accumulate(indexes.byColorAndSize), [
      cup4,
      cup1,
      cup5,
      cup2,
      cup3,
      cup6,
      cup7
    ])
    assert.deepEqual(accumulate(indexes.bySize), [
      cup4,
      cup5,
      cup1,
      cup2,
      cup3,
      cup6,
      cup7
    ])

    cup7 = shareColorWith(cup7, cup4)
    assertReferenceChanges(indexer.update(indexes, [cup2, cup7, cup7]))
    assert.deepEqual(accumulate(indexes.byId), [
      cup1,
      cup2,
      cup3,
      cup4,
      cup5,
      cup6,
      cup7
    ])
    assert.deepEqual(accumulate(indexes.byColorAndSize), [
      cup4,
      cup1,
      cup7,
      cup5,
      cup2,
      cup3,
      cup6
    ])
    assert.deepEqual(accumulate(indexes.bySize), [
      cup4,
      cup5,
      cup1,
      cup2,
      cup3,
      cup6,
      cup7
    ])
  })

  test('reverseIter', () => {
    let cup1 = firstCup
    let cup2 = smallerCupThan(cup1)
    let cup3 = smallerCupThan(cup2)
    let cup4 = smallerCupThan(cup3)
    let cup5 = smallerCupThan(cup4)

    assertReferenceChanges(indexer.update(indexes, [cup2, cup1, cup3]))
    assertReferenceChanges(indexer.update(indexes, [cup5, cup4]))

    assert.deepEqual(
      reverseAccumulate(
        indexes.bySize,
        [cup2.size, Infinity],
        [cup4.size, cup4.id, 'a']
      ),
      [cup2, cup3]
    )
    assert.deepEqual(
      reverseAccumulate(
        indexes.bySize,
        [cup2.size, Infinity],
        [cup4.size, cup4.id]
      ),
      [cup2, cup3]
    )
    assert.deepEqual(
      reverseAccumulate(
        indexes.bySize,
        [cup2.size, Infinity],
        [cup4.size - 0.1]
      ),
      [cup2, cup3, cup4]
    )
    assert.deepEqual(
      reverseAccumulate(
        indexes.bySize,
        [cup2.size, Infinity],
        [cup2.size, Infinity]
      ),
      []
    )
    assert.deepEqual(reverseAccumulate(indexes.bySize, [cup3.size, Infinity]), [
      cup3,
      cup4,
      cup5
    ])
    assert.deepEqual(reverseAccumulate(indexes.bySize), [
      cup1,
      cup2,
      cup3,
      cup4,
      cup5
    ])
  })

  test.skip('performance', () => {
    let cups = [] as Cup[]

    function randomColor() {
      let v = Math.random()

      if (v < 0.1) return 'red'
      if (v < 0.25) return 'orange'
      if (v < 0.45) return 'blue'
      if (v < 0.6) return 'green'
      if (v < 9) return 'yellow'
      return 'purple'
    }

    for (let i = 0; i < 2500; ++i) {
      cups.push({
        id: ++lastCupId,
        color: randomColor(),
        size: Math.floor(Math.random() * 74832)
      })
    }

    let start = Date.now()
    cups.forEach(cup => {
      indexes = indexer.update(indexes, [cup])
    })

    cups.forEach(cup => {
      indexes = indexer.removeByPk(indexes, [cup.id])
    })

    let time = Date.now() - start

    console.log('Permonace: 2500 inserts and removals in', time, 'ms')
  })
})
