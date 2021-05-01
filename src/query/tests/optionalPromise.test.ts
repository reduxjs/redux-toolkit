import { toOptionalPromise } from '../utils/toOptionalPromise'

const id = <T>(x: T) => x
test('should .then normally', async () => {
  await expect(toOptionalPromise(Promise.resolve(5)).then(id)).resolves.toBe(5)
})

test('should .catch normally', async () => {
  await expect(toOptionalPromise(Promise.reject(6)).catch(id)).resolves.toBe(6)
})

test('should .finally normally', async () => {
  const finale = jest.fn()
  await expect(
    toOptionalPromise(Promise.reject(6)).finally(finale).catch(id)
  ).resolves.toBe(6)
  expect(finale).toHaveBeenCalled()
})

test('not interacting should not make jest freak out', () => {
  toOptionalPromise(Promise.reject(6))
})
