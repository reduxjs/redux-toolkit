import { copyWithStructuralSharing } from '@reduxjs/toolkit/query'

// Test for preserving keys with undefined values (issue #5271)
test('preserves keys with undefined values', () => {
  const objA = { page: 1 }
  const objB = { triggeredAddress: undefined, page: 1 }

  // These should be treated as different objects
  const newCopy = copyWithStructuralSharing(objA, objB)
  expect(newCopy).not.toBe(objA)
  expect(newCopy).toStrictEqual(objB)
  expect(Object.getOwnPropertyNames(newCopy)).toContain('triggeredAddress')
})

test('preserves nested keys with undefined values', () => {
  const objA = { filter: { page: 1 } }
  const objB = { filter: { triggeredAddress: undefined, page: 1 } }

  const newCopy = copyWithStructuralSharing(objA, objB)
  expect(newCopy).not.toBe(objA)
  expect(newCopy.filter).not.toBe(objA.filter)
  expect(Object.getOwnPropertyNames(newCopy.filter)).toContain('triggeredAddress')
})

test('returns same object when both have same undefined keys', () => {
  const objA = { triggeredAddress: undefined, page: 1 }
  const objB = { triggeredAddress: undefined, page: 1 }

  const newCopy = copyWithStructuralSharing(objA, objB)
  expect(newCopy).toBe(objA)
  expect(newCopy).toStrictEqual(objB)
})

test('equal object from JSON Object', () => {
  const json = JSON.stringify({
    a: { b: { c: { d: 1, e: '2', f: true }, g: false }, h: null },
    i: null,
  })
  const objA = JSON.parse(json)
  const objB = JSON.parse(json)
  expect(objA).toStrictEqual(objB)
  expect(objA).not.toBe(objB)
  const newCopy = copyWithStructuralSharing(objA, objB)
  expect(newCopy).toBe(objA)
  expect(newCopy).not.toBe(objB)
  expect(newCopy).toStrictEqual(objB)
})

test('equal object from JSON Object', () => {
  const json = JSON.stringify({
    a: { b: { c: { d: 1, e: '2', f: true }, g: false }, h: null },
    i: null,
  })
  const objA = JSON.parse(json)
  const objB = JSON.parse(json)
  objB.a.h = 4
  expect(objA).not.toStrictEqual(objB)
  expect(objA).not.toBe(objB)
  expect(objA.a.b).toStrictEqual(objB.a.b)
  expect(objA.a.b).not.toBe(objB.a.b)

  const newCopy = copyWithStructuralSharing(objA, objB)
  expect(newCopy).not.toBe(objA)
  expect(newCopy).not.toStrictEqual(objA)
  expect(newCopy).toStrictEqual(objB)

  expect(newCopy.a.b).toBe(objA.a.b)
  expect(newCopy.a.b).not.toBe(objB.a.b)
  expect(newCopy.a.b).toStrictEqual(objB.a.b)
})

test('equal object from JSON Array', () => {
  const json = JSON.stringify([
    1,
    'a',
    { 2: 'b' },
    { 3: { 4: 'c' }, d: null },
    null,
    5,
  ])
  const objA = JSON.parse(json)
  const objB = JSON.parse(json)

  expect(objA).toStrictEqual(objB)
  expect(objA).not.toBe(objB)
  const newCopy = copyWithStructuralSharing(objA, objB)
  expect(newCopy).toBe(objA)
  expect(newCopy).not.toBe(objB)
  expect(newCopy).toStrictEqual(objB)
})

test('equal object from JSON Array', () => {
  const json = JSON.stringify([
    1,
    'a',
    { 2: 'b' },
    { 3: { 4: 'c' }, d: null },
    null,
    5,
  ])
  const objA = JSON.parse(json)
  const objB = JSON.parse(json)
  objB[2][2] = 'x'

  expect(objA).not.toStrictEqual(objB)
  expect(objA).not.toBe(objB)
  const newCopy = copyWithStructuralSharing(objA, objB)
  expect(newCopy).not.toBe(objA)
  expect(newCopy).not.toBe(objB)
  expect(newCopy).toStrictEqual(objB)

  expect(newCopy[3]).toBe(objA[3])
  expect(newCopy[3]).not.toBe(objB[3])
  expect(newCopy[3]).toStrictEqual(objB[3])

  expect(newCopy[2]).not.toBe(objA[2])
  expect(newCopy[2]).not.toBe(objB[2])
  expect(newCopy[2]).toStrictEqual(objB[2])
})
