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
  expect(await generate()).toMatch(new RegExp(`export type ${name}ApiResponse =[^;]*string;`));
});

test.each(['hello', 'html'])('text response %s uses the text response handler', async (name) => {
  expect(requests(await generate())[name].query()).toEqual({
    url: name === 'hello' ? '/hello' : '/html',
    responseHandler: 'text',
  });
});

test.each(['hello', 'html', 'mixed', 'ref', 'created', 'textWithDefaultJson'])(
  'generated text response %s can be read by fetchBaseQuery',
  async (name) => {
    const query = requests(await generate())[name].query();
    const result = await fetchBaseQuery({
      baseUrl: 'https://example.com',
      fetchFn: async () =>
        new Response('Hello world!', { headers: { 'content-type': 'text/plain' } }) as unknown as globalThis.Response,
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
    expect(result.data).toBe('Hello world!');
    expect(result.error).toBeUndefined();
  }
);

test.each(['mixed', 'ref', 'created', 'textWithDefaultJson'])('%s selects successful text responses', async (name) => {
  const source = await generate();
  expect(requests(source)[name].query().responseHandler).toBe('text');
  expect(source).toContain(`export type ${name[0].toUpperCase() + name.slice(1)}ApiResponse = string;`);
});

test.each([false, true])('default response selection respects includeDefault=%s', async (includeDefault) => {
  const source = await generate({ includeDefault });
  const endpoints = requests(source);
  expect(endpoints.defaultText.query().responseHandler).toBe(includeDefault ? 'text' : undefined);
  expect(source).toContain(`export type DefaultTextApiResponse = ${includeDefault ? 'string' : 'unknown'};`);
  expect(endpoints.textWithDefaultJson.query().responseHandler).toBe(includeDefault ? undefined : 'text');
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
  expect(endpoints.jsonWithTextError.query().responseHandler).toBe('text');
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
