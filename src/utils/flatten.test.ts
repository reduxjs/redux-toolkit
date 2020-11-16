import { flatten } from './flatten';

test('flattens an array to a depth of 1', () => {
  expect(flatten([1, 2, [3, 4]])).toEqual([1, 2, 3, 4]);
});

test('does not flatten to a depth of 2', () => {
  const flattenResult = flatten([1, 2, [3, 4, [5, 6]]]);
  expect(flattenResult).not.toEqual([1, 2, 3, 4, 5, 6]);
  expect(flattenResult).toEqual([1, 2, 3, 4, [5, 6]]);
});
