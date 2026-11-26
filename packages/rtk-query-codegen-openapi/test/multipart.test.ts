import { generateEndpoints } from '@rtk-query/codegen-openapi';
import { resolve } from 'node:path';

const baseOptions = {
  unionUndefined: true,
  apiFile: './fixtures/emptyApi.ts',
  schemaFile: resolve(__dirname, 'fixtures/multipart.json'),
};

test('multipart/form-data request bodies are converted to FormData', async () => {
  const api = await generateEndpoints({
    ...baseOptions,
    filterEndpoints: ['uploadAvatar'],
  });
  expect(api).toContain('new FormData()');
  expect(api).toContain('for (const [key, value] of Object.entries(queryArg.body))');
  expect(api).toContain('appendToFormData(formData, key, value)');
  // the raw object must not be passed as the body directly
  expect(api).not.toContain('body: queryArg.body');
  expect(api).toMatch(/return \{ url: `\/api\/Avatar`, method: "POST", body: formData \}/);
  expect(api).toMatchSnapshot();
});

test('an optional multipart body still maps to undefined when not provided', async () => {
  const api = await generateEndpoints({
    ...baseOptions,
    filterEndpoints: ['createDocument'],
  });
  expect(api).toContain('new FormData()');
  expect(api).toContain('Object.entries(queryArg.body ?? {})');
  expect(api).toContain('body: queryArg.body === undefined ? undefined : formData');
});

test('json-only request bodies are passed through unchanged and no helper is emitted', async () => {
  const api = await generateEndpoints({
    ...baseOptions,
    filterEndpoints: ['createNote'],
  });
  expect(api).not.toContain('FormData');
  expect(api).not.toContain('appendToFormData');
  expect(api).toContain('body: queryArg.body');
});

test('operations offering both multipart and json content keep the json behavior', async () => {
  const api = await generateEndpoints({
    ...baseOptions,
    filterEndpoints: ['uploadOrJson'],
  });
  expect(api).not.toContain('new FormData()');
  expect(api).not.toContain('appendToFormData');
  expect(api).toContain('body: queryArg.body');
});

test('the FormData conversion helper is emitted only once for several multipart endpoints', async () => {
  const api = await generateEndpoints({
    ...baseOptions,
    filterEndpoints: (name) => name === 'uploadAvatar' || name === 'createDocument',
  });
  const occurrences = api.split('const appendToFormData').length - 1;
  expect(occurrences).toBe(1);
  // both endpoints use it
  expect(api.match(/appendToFormData\(formData, key, value\)/g)?.length).toBe(2);
  expect(api).toMatchSnapshot();
});

test('multipart conversion also applies with flattenArg', async () => {
  const api = await generateEndpoints({
    ...baseOptions,
    flattenArg: true,
    filterEndpoints: ['uploadAvatar'],
  });
  expect(api).toContain('new FormData()');
  expect(api).toContain('for (const [key, value] of Object.entries(queryArg))');
  expect(api).toContain('body: formData');
  expect(api).not.toContain('body: queryArg');
});

test('multipart media type matching is case-insensitive and blob detection is realm-independent', async () => {
  const api = await generateEndpoints({
    ...baseOptions,
    filterEndpoints: ['mixedCaseMultipart'],
  });
  expect(api).toContain('new FormData()');
  expect(api).toContain('Object.entries(queryArg.body)');
  expect(api).toContain('Object.prototype.toString.call(item) === "[object Blob]"');
});

test('multipart serialization uses the multipart schema for the argument type', async () => {
  const api = await generateEndpoints({
    ...baseOptions,
    filterEndpoints: ['textThenMultipart'],
  });
  expect(api).toContain('new FormData()');
  expect(api).toMatch(/export type TextThenMultipartApiArg = \{\s+body: \{\s+file: Blob;/);
  expect(api).not.toMatch(/export type TextThenMultipartApiArg = \{\s+body: string/);
});
