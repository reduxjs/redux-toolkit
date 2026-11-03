import { generateEndpoints } from '@rtk-query/codegen-openapi';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { fetchBaseQuery } from '@reduxjs/toolkit/query';
import { Response } from 'node-fetch';

async function generate(
  options: Pick<import('../src/types').GenerationOptions, 'includeDefault' | 'isDataResponse'> = {}
) {
  return (await generateEndpoints({
    apiFile: './emptyApi',
    schemaFile: resolve(__dirname, 'fixtures/text-response.json'),
    ...options,
  }))!;
}

function requests(source: string) {
  let endpoints: Record<string, { query: () => Record<string, unknown> }> = {};
  const api = {
    injectEndpoints(options: { endpoints: (builder: unknown) => typeof endpoints }) {
      endpoints = options.endpoints({ query: (definition: unknown) => definition });
      return {};
    },
  };
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  runInNewContext(compiled.outputText, { exports: {}, require: () => ({ api }) });
  return endpoints;
}

test.each(['Hello', 'Html'])('text response %s is typed as string (#3603)', async (name) => {
  expect(await generate()).toContain(`export type ${name}ApiResponse = string;`);
});

test.each(['hello', 'html'])('text response %s uses the content-type response handler', async (name) => {
  expect(requests(await generate())[name].query()).toEqual({
    url: name === 'hello' ? '/hello' : '/html',
    responseHandler: 'content-type',
  });
});

async function fetchGenerated(name: string, response: Response, options?: Parameters<typeof generate>[0]) {
  const query = requests(await generate(options))[name].query();
  return fetchBaseQuery({
    baseUrl: 'https://example.com',
    fetchFn: async () => response as unknown as globalThis.Response,
  })(
    query as { url: string },
    {
      signal: new AbortController().signal,
      abort: () => {},
      dispatch: vi.fn(),
      getState: () => ({}),
      extra: undefined,
      endpoint: name,
      type: 'query',
    },
    {}
  );
}

test.each(['hello', 'html', 'mixed', 'ref', 'created', 'textWithDefaultJson'])(
  'generated text response %s can be read by fetchBaseQuery',
  async (name) => {
    const result = await fetchGenerated(
      name,
      new Response('Hello world!', { headers: { 'content-type': 'text/plain' } })
    );
    expect(result.data).toBe('Hello world!');
    expect(result.error).toBeUndefined();
  }
);

test('JSON error responses of text endpoints are still parsed as JSON', async () => {
  const result = await fetchGenerated(
    'mixed',
    new Response('{"message":"bad"}', { status: 400, headers: { 'content-type': 'application/json' } })
  );
  expect(result.error).toEqual({ status: 400, data: { message: 'bad' } });
});

test('JSON default responses of text endpoints are parsed as JSON with includeDefault', async () => {
  const text = await fetchGenerated(
    'textWithDefaultJson',
    new Response('Hello world!', { headers: { 'content-type': 'text/plain' } }),
    { includeDefault: true }
  );
  expect(text.data).toBe('Hello world!');
  const json = await fetchGenerated(
    'textWithDefaultJson',
    new Response('{"ok":true}', { status: 202, headers: { 'content-type': 'application/json' } }),
    { includeDefault: true }
  );
  expect(json.data).toEqual({ ok: true });
});

test('JSON success responses excluded by isDataResponse are still parsed as JSON', async () => {
  const result = await fetchGenerated(
    'jsonWithTextError',
    new Response('{"ok":true}', { headers: { 'content-type': 'application/json' } }),
    { isDataResponse: (code) => code === '400' }
  );
  expect(result.data).toEqual({ ok: true });
});

test('mixed text and JSON success responses are each parsed by content type', async () => {
  const source = await generate();
  expect(requests(source).textOrJson.query().responseHandler).toBe('content-type');
  expect(source).toMatch(/export type TextOrJsonApiResponse =[^;]*\| string\s*\|[^;]*\bobject;/);
  const text = await fetchGenerated(
    'textOrJson',
    new Response('Hello world!', { headers: { 'content-type': 'text/plain' } })
  );
  expect(text.data).toBe('Hello world!');
  const json = await fetchGenerated(
    'textOrJson',
    new Response('{"ok":true}', { status: 201, headers: { 'content-type': 'application/json' } })
  );
  expect(json.data).toEqual({ ok: true });
});

test.each(['mixed', 'ref', 'created', 'textWithDefaultJson'])('%s selects successful text responses', async (name) => {
  const source = await generate();
  expect(requests(source)[name].query().responseHandler).toBe('content-type');
  expect(source).toContain(`export type ${name[0].toUpperCase() + name.slice(1)}ApiResponse = string;`);
});

test.each([false, true])('default response selection respects includeDefault=%s', async (includeDefault) => {
  const source = await generate({ includeDefault });
  const endpoints = requests(source);
  expect(endpoints.defaultText.query().responseHandler).toBe(includeDefault ? 'content-type' : undefined);
  expect(source).toContain(`export type DefaultTextApiResponse = ${includeDefault ? 'string' : 'unknown'};`);
  expect(endpoints.textWithDefaultJson.query().responseHandler).toBe('content-type');
  if (includeDefault) {
    expect(source).not.toContain('export type TextWithDefaultJsonApiResponse = string;');
  }
  expect(endpoints.jsonWithTextError.query()).toEqual({ url: '/json-with-text-error' });
});

test('custom isDataResponse receives resolved responses and determines text selection', async () => {
  const isDataResponse = vi.fn((code, _includeDefault, response, allResponses) => {
    expect(response).not.toHaveProperty('$ref');
    expect(response).toHaveProperty('description');
    expect(allResponses).toHaveProperty(code);
    return code === '400';
  });
  const source = await generate({ isDataResponse });
  const endpoints = requests(source);
  expect(endpoints.mixed.query()).toEqual({ url: '/mixed' });
  expect(endpoints.jsonWithTextError.query().responseHandler).toBe('content-type');
  expect(source).toContain('export type JsonWithTextErrorApiResponse = string;');
  expect(endpoints.hello.query()).toEqual({ url: '/hello' });
  expect(source).toContain('export type HelloApiResponse = unknown;');
  expect(isDataResponse).toHaveBeenCalled();
});

test('JSON and binary response generation remains unchanged', async () => {
  const source = await generate();
  const endpoints = requests(source);
  expect(endpoints.json.query()).toEqual({ url: '/json' });
  expect(endpoints.binary.query()).toEqual({ url: '/binary' });
  expect(endpoints.empty.query()).toEqual({ url: '/empty' });
  expect(endpoints.errorText.query()).toEqual({ url: '/error-text' });
  expect(source).toContain('export type EmptyApiResponse = unknown;');
  expect(source).toContain('export type ErrorTextApiResponse = unknown;');
  expect(source).toMatch(/export type JsonApiResponse =[^;]*\{\s*ok\?: boolean;/);
  expect(source).toContain('export type BinaryApiResponse = unknown;');
});
