import { joinUrls } from './joinUrls';

test('correctly joins variations relative urls', () => {
  expect(joinUrls('/api/', '/banana')).toBe('/api/banana');
  expect(joinUrls('/api', '/banana')).toBe('/api/banana');

  expect(joinUrls('/api/', 'banana')).toBe('/api/banana');
  expect(joinUrls('/api/', '/banana/')).toBe('/api/banana/');

  expect(joinUrls('/', '/banana/')).toBe('/banana/');
  expect(joinUrls('/', 'banana/')).toBe('/banana/');

  expect(joinUrls('/', '/banana')).toBe('/banana');
  expect(joinUrls('/', 'banana')).toBe('/banana');

  expect(joinUrls('', '/banana')).toBe('/banana');
  expect(joinUrls('', 'banana')).toBe('banana');
});

test('correctly joins variations of absolute urls', () => {
  expect(joinUrls('https://apple.com', '/api/banana/')).toBe('https://apple.com/api/banana/');
  expect(joinUrls('https://apple.com', '/api/banana')).toBe('https://apple.com/api/banana');

  expect(joinUrls('https://apple.com/', 'api/banana/')).toBe('https://apple.com/api/banana/');
  expect(joinUrls('https://apple.com/', 'api/banana')).toBe('https://apple.com/api/banana');

  expect(joinUrls('https://apple.com/', 'api/banana/')).toBe('https://apple.com/api/banana/');
});
