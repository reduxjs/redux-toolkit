import { Tuple } from '@reduxjs/toolkit'
import { expectType } from './helpers'

/**
 * Test: compatibility is checked between described types
 */
{
  const stringTuple = new Tuple('')

  expectType<Tuple<[string]>>(stringTuple)

  expectType<Tuple<string[]>>(stringTuple)

  // @ts-expect-error
  expectType<Tuple<[string, string]>>(stringTuple)

  const numberTuple = new Tuple(0, 1)
  // @ts-expect-error
  expectType<Tuple<string[]>>(numberTuple)
}

/**
 * Test: concat is inferred properly
 */
{
  const singleString = new Tuple('')

  expectType<Tuple<[string]>>(singleString)

  expectType<Tuple<[string, string]>>(singleString.concat(''))

  expectType<Tuple<[string, string]>>(singleString.concat(['']))
}

/**
 * Test: prepend is inferred properly
 */
{
  const singleString = new Tuple('')

  expectType<Tuple<[string]>>(singleString)

  expectType<Tuple<[string, string]>>(singleString.prepend(''))

  expectType<Tuple<[string, string]>>(singleString.prepend(['']))
}

/**
 * Test: push must match existing items
 */
{
  const stringTuple = new Tuple('')

  stringTuple.push('')

  // @ts-expect-error
  stringTuple.push(0)
}

/**
 * Test: Tuples can be combined
 */
{
  const stringTuple = new Tuple('')

  const numberTuple = new Tuple(0, 1)

  expectType<Tuple<[string, number, number]>>(stringTuple.concat(numberTuple))

  expectType<Tuple<[number, number, string]>>(stringTuple.prepend(numberTuple))

  expectType<Tuple<[number, number, string]>>(numberTuple.concat(stringTuple))

  expectType<Tuple<[string, number, number]>>(numberTuple.prepend(stringTuple))

  // @ts-expect-error
  expectType<Tuple<[string, number, number]>>(stringTuple.prepend(numberTuple))

  // @ts-expect-error
  expectType<Tuple<[number, number, string]>>(stringTuple.concat(numberTuple))
}
