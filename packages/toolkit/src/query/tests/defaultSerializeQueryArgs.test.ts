import { defaultSerializeQueryArgs } from '@reduxjs/toolkit/query'

const endpointDefinition: any = {}
const endpointName = 'test'

// INV-Q-044: the default cache key is `${endpointName}(${JSON.stringify(sortedArgs)})`
test('string arg', () => {
  expect(
    defaultSerializeQueryArgs({
      endpointDefinition,
      endpointName,
      queryArgs: 'arg',
    }),
  ).toMatchInlineSnapshot(`"test("arg")"`)
})

// INV-Q-044: the default cache key is `${endpointName}(${JSON.stringify(sortedArgs)})`
test('number arg', () => {
  expect(
    defaultSerializeQueryArgs({
      endpointDefinition,
      endpointName,
      queryArgs: 5,
    }),
  ).toMatchInlineSnapshot(`"test(5)"`)
})

// INV-Q-046: BigInt args serialize to `{ $bigint: "..." }` rather than throwing
test('bigint arg has non-default serialization (instead of throwing)', () => {
  expect(
    defaultSerializeQueryArgs({
      endpointDefinition,
      endpointName,
      queryArgs: BigInt(10),
    }),
  ).toMatchInlineSnapshot(`"test({"$bigint":"10"})"`)
})

// INV-Q-044: the default cache key is `${endpointName}(${JSON.stringify(sortedArgs)})`
// INV-Q-045: object arg keys are sorted before stringification, so key order does not affect cache identity
test('simple object arg is sorted', () => {
  expect(
    defaultSerializeQueryArgs({
      endpointDefinition,
      endpointName,
      queryArgs: { name: 'arg', age: 5 },
    }),
  ).toMatchInlineSnapshot(`"test({"age":5,"name":"arg"})"`)
})

// INV-Q-045: object arg keys are sorted recursively, so key order does not affect cache identity
test('nested object arg is sorted recursively', () => {
  expect(
    defaultSerializeQueryArgs({
      endpointDefinition,
      endpointName,
      queryArgs: { name: { last: 'Split', first: 'Banana' }, age: 5 },
    }),
  ).toMatchInlineSnapshot(
    `"test({"age":5,"name":{"first":"Banana","last":"Split"}})"`,
  )
})

// INV-Q-045: object arg keys are sorted recursively, so key order does not affect cache identity
test('Fully serializes a deeply nested object', () => {
  const nestedObj = {
    a: {
      a1: {
        a11: {
          a111: 1,
        },
      },
    },
    b: {
      b2: {
        b21: 3,
      },
      b1: {
        b11: 2,
      },
    },
  }

  const res = defaultSerializeQueryArgs({
    endpointDefinition,
    endpointName,
    queryArgs: nestedObj,
  })
  expect(res).toMatchInlineSnapshot(
    `"test({"a":{"a1":{"a11":{"a111":1}}},"b":{"b1":{"b11":2},"b2":{"b21":3}}})"`,
  )
})

// INV-Q-047: the serialization WeakMap caches only plain objects, by reference identity
test('Caches results for plain objects', () => {
  const testData = Array.from({ length: 10000 }).map((_, i) => {
    return {
      albumId: i,
      id: i,
      title: 'accusamus beatae ad facilis cum similique qui sunt',
      url: 'https://via.placeholder.com/600/92c952',
      thumbnailUrl: 'https://via.placeholder.com/150/92c952',
    }
  })

  const data = {
    testData,
  }

  const runWithTimer = (data: any) => {
    const start = Date.now()
    const res = defaultSerializeQueryArgs({
      endpointDefinition,
      endpointName,
      queryArgs: data,
    })
    const end = Date.now()
    const duration = end - start
    return [res, duration] as const
  }

  const [res1, time1] = runWithTimer(data)
  const [res2, time2] = runWithTimer(data)

  expect(res1).toBe(res2)
  expect(time2).toBeLessThanOrEqual(time1)
  // Locally, stringifying 10K items takes 25-30ms.
  // Assuming the WeakMap cache hit, this _should_ be 0
  expect(time2).toBeLessThan(2)
})
