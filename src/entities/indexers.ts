/** Given an array of sorted items and a new item, calculate the correct index to insert at */
export function bisect<T, E>(
  array: T[],
  e: E,
  cmp: (a: E, b: T) => number,
  l = 0,
  r = array.length
) {
  let mid: number
  let c: number

  while (l < r) {
    mid = (l + r) >>> 1
    c = cmp(e, array[mid])
    if (c > 0) {
      l = mid + 1
    } else {
      r = mid
    }
  }

  return l
}

export function arrayCmp(a: any[], b: any[]): number {
  for (let i = 0; i < a.length && i < b.length; ++i) {
    let aVal = a[i]
    let bVal = b[i]

    if (aVal === bVal) continue

    if (bVal === Infinity) return -1
    if (aVal === Infinity) return 1
    if (aVal == null) return -1
    if (bVal == null) return 1
    if (aVal < bVal) return -1
    return 1
  }

  if (a.length === b.length) return 0
  if (a.length > b.length) return 1
  return -1
}

export function numberCmp(a: number, b: number) {
  return a - b
}

/** Array of [extractedFieldsToSortBy, originalItem] */
export type Entry<V> = [any[], V]
/** Array of item entries */
export type Index<V> = Entry<V>[]
/** Lookup table of index names to entry arrays */
export type IndexStore<V> = { [k: string]: Index<V> }
/** Function that takes an item and returns the extracted fields to sort by */
export type Keyer<V> = (v: V) => any[]
/** Function that returns the next item or undefined */
export type IndexIterator<V> = () => V | void
/** Function that receives the generated forward/reverse iterators, and returns an item */
export type GroupReducer<V> = (
  iter: IndexIterator<V>,
  reverseIter: IndexIterator<V>
) => V | void

/** Accepts a comparison fields array and another entry, and compares them */
function cmpKeyToEntry(a: any[], b: Entry<any>) {
  return arrayCmp(a, b[0])
}

export class Indexer<V, I extends IndexStore<V>> {
  private indexKeyers = {} as Record<keyof I, Keyer<V>> // { [k: keyof I]: Keyer<V> }
  private indexDependentGroup = {} as Record<keyof I, string> // { [k: string]: string }
  private indexGroupKeyers = {} as Record<keyof I, Keyer<V>> // { [k: string]: Keyer<V> }
  private indexReducers = {} as Record<keyof I, GroupReducer<V>> // { [k: string]: GroupReducer<V> }
  private indexes = [] as (keyof I)[]

  constructor(private mainIndexName: keyof I) {}

  addIndex(attr: keyof I, keyer: Keyer<V>) {
    // Can only have one index definition per name
    if (attr in this.indexKeyers) {
      throw new Error('duplicate definition for index ' + attr)
    }
    // Store lookup of index name -> field extractor
    this.indexKeyers[attr] = keyer
    // Update array of index names
    this.indexes.push(attr)
  }

  addGroupedIndex(
    attr: keyof I,
    keyer: Keyer<V>,
    groupAttr: keyof I,
    groupKeyer: Keyer<V>,
    reducer: GroupReducer<V>
  ) {
    if (!this.indexKeyers[groupAttr]) {
      throw new Error(
        'Dependent index ' + groupAttr + ' should be defined before ' + attr
      )
    }
    this.addIndex(attr, keyer)

    // @ts-ignore TODO Fix this
    this.indexDependentGroup[attr] = groupAttr
    this.indexGroupKeyers[attr] = groupKeyer
    this.indexReducers[attr] = reducer
  }

  // @ts-ignore TODO Fix this
  private _empty: I

  matchesInitialState(initialState: I) {
    return this._empty === initialState
  }

  empty(): I {
    // Return existing "empty data" object if it exists
    if (this._empty) return this._empty

    // Otherwise, fill it out with an empty array per index name
    let result = (this._empty = {} as I)
    for (let k in this.indexKeyers) {
      // @ts-ignore TODO Fix this
      result[k] = []
    }

    return result
  }

  /** Removes a set of values from all indices */
  removeAll(indexes: I, values: V[]) {
    return this.splice(indexes, values, [])
  }

  /** Removes a set of items from all indices by IDs */
  removeByPk(indexes: I, primaryKey: any[]): I {
    return this.removeAll(
      indexes,
      Indexer.getAllMatching(indexes[this.mainIndexName], primaryKey)
    )
  }

  /** Upserts (?) items */
  update(indexes: I, values: V[]): I {
    let oldValues = [] as V[]
    let newValues = [] as V[]

    let uniqueValues = uniqueIndex(this.indexKeyers[this.mainIndexName], values)
    uniqueValues.forEach(v => {
      let existing = Indexer.getFirstMatching(indexes[this.mainIndexName], v[0])
      if (existing) oldValues.push(existing)
      newValues.push(v[1])
    })

    return this.splice(indexes, oldValues, newValues)
  }

  static iterator<V>(
    index: Index<V>,
    startKey?: any[],
    endKey?: any[]
  ): IndexIterator<V> {
    let { startIdx, endIdx } = Indexer.getRangeFrom(index, startKey, endKey)
    let idx = startIdx

    return () => {
      if (idx < endIdx) {
        return index[idx++][1]
      }
    }
  }

  static reverseIter<V>(
    index: Index<V>,
    startKey?: any[],
    endKey?: any[]
  ): IndexIterator<V> {
    if (startKey) startKey = startKey.concat([undefined])
    if (endKey) endKey = endKey.concat([undefined])

    let { startIdx, endIdx } = Indexer.getRangeFrom(index, endKey, startKey)
    let idx = endIdx

    return () => {
      if (idx > startIdx) {
        return index[--idx][1]
      }
    }
  }

  static getAllMatching<V>(index: Index<V>, key: any[]): V[] {
    let { startIdx, endIdx } = Indexer.getRangeFrom(
      index,
      key,
      key.concat([Infinity])
    )
    return index.slice(startIdx, endIdx).map(([_, value]) => value)
  }

  static getAllUniqueMatchingAnyOf<V>(index: Index<V>, keys: any[][]): V[] {
    let result = [] as V[]
    let retrievedIdxs = new Int8Array(index.length)

    for (let key of keys) {
      let { startIdx, endIdx } = Indexer.getRangeFrom(
        index,
        key,
        key.concat([Infinity])
      )
      for (; startIdx < endIdx; ++startIdx) {
        if (retrievedIdxs[startIdx]) continue
        retrievedIdxs[startIdx] = 1
        result.push(index[startIdx][1])
      }
    }

    return result
  }

  /**  */
  static getRangeFrom(index: Index<any>, startKey?: any[], endKey?: any[]) {
    let startIdx: number
    let endIdx: number

    if (startKey == null) {
      startIdx = 0
    } else {
      startIdx = bisect<Entry<any>, any[]>(index, startKey, cmpKeyToEntry)
    }

    if (endKey == null) {
      endIdx = index.length
    } else {
      endIdx = bisect<Entry<any>, any[]>(index, endKey, cmpKeyToEntry)
    }

    return { startIdx, endIdx }
  }

  static getFirstMatching<V>(index: Index<V>, key: any[]): V | void {
    let iter = Indexer.iterator(index, key, key.concat([Infinity]))
    return iter()
  }

  private splice(indexes: I, removeValues: V[], addValues: V[]) {
    let oldIndexes = indexes
    if (!removeValues.length && !addValues.length) {
      return indexes
    }

    indexes = { ...(indexes as any) }

    for (let indexName of this.indexes) {
      let index = indexes[indexName]
      let valuesToRemove = removeValues
      let valuesToAdd = addValues

      const groupIndexName = this.indexDependentGroup[indexName]
      if (groupIndexName) {
        let groupKeyer = this.indexGroupKeyers[indexName]
        let reducer = this.indexReducers[indexName]

        let updateGroups = uniqueIndex(
          groupKeyer,
          valuesToRemove.concat(valuesToAdd)
        )
        valuesToRemove = []
        valuesToAdd = []

        for (let updateGroup of updateGroups) {
          let updateGroupKey = updateGroup[0]
          const prevGroupIndex = oldIndexes[groupIndexName]
          let iter = Indexer.iterator(
            prevGroupIndex,
            updateGroupKey,
            updateGroupKey.concat([Infinity])
          )
          let reverseIter = Indexer.reverseIter(
            prevGroupIndex,
            updateGroupKey.concat([Infinity]),
            updateGroupKey
          )
          let remove = reducer(iter, reverseIter)

          const curGroupIndex = indexes[groupIndexName]
          iter = Indexer.iterator(
            curGroupIndex,
            updateGroupKey,
            updateGroupKey.concat([Infinity])
          )
          reverseIter = Indexer.reverseIter(
            curGroupIndex,
            updateGroupKey.concat([Infinity]),
            updateGroupKey
          )
          let add = reducer(iter, reverseIter)

          if (remove === add) continue
          if (remove) valuesToRemove.push(remove)
          if (add) valuesToAdd.push(add)
        }
      }

      if (!valuesToAdd.length && !valuesToRemove.length) {
        continue
      }

      // @ts-ignore TODO Fix this
      index = indexes[indexName] = indexes[indexName].slice()

      for (let value of valuesToRemove) {
        this.removeFromIndex(index, indexName, value)
      }

      for (let value of valuesToAdd) {
        this.addToIndex(index, indexName, value)
      }
    }

    return indexes
  }

  private strictValueKeyOf(indexName: keyof I, value: V): any[] {
    let pk = this.indexKeyers[this.mainIndexName](value)

    if (indexName === this.mainIndexName) {
      return pk
    }

    const indexKey = this.indexKeyers[indexName](value)
    Array.prototype.push.apply(indexKey, pk)
    return indexKey
  }

  private addToIndex(index: Index<V>, indexName: keyof I, v: V) {
    let key = this.strictValueKeyOf(indexName, v)
    let { startIdx } = Indexer.getRangeFrom(index, key)
    index.splice(startIdx, 0, [key, v])
  }

  private removeFromIndex(index: Index<any>, indexName: keyof I, v: V) {
    let key = this.strictValueKeyOf(indexName, v)
    let { startIdx, endIdx } = Indexer.getRangeFrom(
      index,
      key,
      key.concat([null])
    )
    index.splice(startIdx, endIdx - startIdx)
  }
}

function uniqueIndex<V>(
  keyer: Keyer<V>,
  values: V[],
  index = [] as Index<V>
): Index<V> {
  // Loop through all items in the array
  for (let value of values) {
    // Get comparison fields array
    let key = keyer(value)

    let { startIdx, endIdx } = Indexer.getRangeFrom(
      index,
      key,
      key.concat([null])
    )
    index.splice(startIdx, endIdx - startIdx, [key, value])
  }

  return index
}
