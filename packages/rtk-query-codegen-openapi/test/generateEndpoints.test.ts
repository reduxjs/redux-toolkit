import del from 'del';
import fs from 'node:fs';
import path, { resolve } from 'node:path';
import { generateEndpoints } from '../src';

const tmpDir = path.resolve(__dirname, 'tmp');

beforeAll(async () => {
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
});

afterEach(() => {
  del.sync(`${tmpDir}/*.ts`);
});

test('calling without `outputFile` returns the generated api', async () => {
  const api = await generateEndpoints({
    unionUndefined: true,
    apiFile: './fixtures/emptyApi.ts',
    schemaFile: resolve(__dirname, 'fixtures/petstore.json'),
  });
  expect(api).toMatchSnapshot();
});

describe('non-path parameter filtering', () => {
  it('should filter parameters by string', async () => {
    const api = await generateEndpoints({
      unionUndefined: true,
      apiFile: './fixtures/emptyApi.ts',
      schemaFile: resolve(__dirname, 'fixtures/petstore.json'),
      filterParameters: 'status',
    });
    expect(api).toMatchSnapshot('should only have the "status" parameter from the endpoints');
  });

  it('should filter parameters by regex', async () => {
    const api = await generateEndpoints({
      unionUndefined: true,
      apiFile: './fixtures/emptyApi.ts',
      schemaFile: resolve(__dirname, 'fixtures/petstore.json'),
      filterParameters: /e/,
    });
    expect(api).toMatchSnapshot('should only have the parameters with an "e"');
  });

  it('should filter by array of parameter strings / regex', async () => {
    const api = await generateEndpoints({
      unionUndefined: true,
      apiFile: './fixtures/emptyApi.ts',
      schemaFile: resolve(__dirname, 'fixtures/petstore.json'),
      filterParameters: [/e/, 'status'],
    });
    expect(api).toMatchSnapshot('should only have the parameters with an "e" or is "status"');
  });

  it('should filter by function', async () => {
    const api = await generateEndpoints({
      unionUndefined: true,
      apiFile: './fixtures/emptyApi.ts',
      schemaFile: resolve(__dirname, 'fixtures/petstore.json'),
      filterParameters: (_, param) => !(param.in === 'header'),
    });
    expect(api).toMatchSnapshot('should remove any parameters from the header');
  });
});

test('endpoint filtering', async () => {
  const api = await generateEndpoints({
    unionUndefined: true,
    apiFile: './fixtures/emptyApi.ts',
    schemaFile: resolve(__dirname, 'fixtures/petstore.json'),
    filterEndpoints: ['loginUser', /Order/],
  });
  expect(api).toMatchSnapshot('should only have endpoints loginUser, placeOrder, getOrderById, deleteOrder');
});

test('endpoint filtering by function', async () => {
  const api = await generateEndpoints({
    unionUndefined: true,
    apiFile: './fixtures/emptyApi.ts',
    schemaFile: resolve(__dirname, 'fixtures/petstore.json'),
    filterEndpoints: (name, endpoint) => name.match(/order/i) !== null && endpoint.verb === 'get',
  });
  expect(api).toMatch(/getOrderById:/);
  expect(api).not.toMatch(/placeOrder:/);
  expect(api).not.toMatch(/loginUser:/);
});

test('negated endpoint filtering', async () => {
  const api = await generateEndpoints({
    unionUndefined: true,
    apiFile: './fixtures/emptyApi.ts',
    schemaFile: resolve(__dirname, 'fixtures/petstore.json'),
    filterEndpoints: (name) => !/user/i.test(name),
  });
  expect(api).not.toMatch(/loginUser:/);
});

test('endpoint overrides', async () => {
  const api = await generateEndpoints({
    unionUndefined: true,
    apiFile: './fixtures/emptyApi.ts',
    schemaFile: resolve(__dirname, 'fixtures/petstore.json'),
    filterEndpoints: 'loginUser',
    endpointOverrides: [
      {
        pattern: 'loginUser',
        type: 'mutation',
      },
    ],
  });
  expect(api).not.toMatch(/loginUser: build.query/);
  expect(api).toMatch(/loginUser: build.mutation/);
  expect(api).toMatchSnapshot('loginUser should be a mutation');
});

describe('option flattenArg', () => {
  const config = {
    apiFile: './fixtures/emptyApi.ts',
    schemaFile: resolve(__dirname, 'fixtures/petstore.json'),
    flattenArg: true,
  };

  it('should apply a queryArg directly in the path', async () => {
    const api = await generateEndpoints({
      ...config,
      filterEndpoints: ['getOrderById'],
    });
    // eslint-disable-next-line no-template-curly-in-string
    expect(api).toContain('`/store/order/${queryArg}`');
    expect(api).toMatch(/export type GetOrderByIdApiArg =[\s/*]+ID of order that needs to be fetched[\s/*]+number;/);
  });

  it('should apply a queryArg directly in the params', async () => {
    const api = await generateEndpoints({
      ...config,
      filterEndpoints: ['findPetsByStatus'],
    });
    expect(api).toContain('params: { status: queryArg }');
    expect(api).not.toContain('export type FindPetsByStatusApiArg = {');
  });

  it('should use the queryArg as the entire body', async () => {
    const api = await generateEndpoints({
      ...config,
      filterEndpoints: ['addPet'],
    });
    expect(api).toMatch(/body: queryArg[^.]/);
  });

  it('should not change anything if there are 2+ arguments.', async () => {
    const api = await generateEndpoints({
      ...config,
      filterEndpoints: ['uploadFile'],
    });
    expect(api).toContain('queryArg.body');
  });
});

test('hooks generation', async () => {
  const api = await generateEndpoints({
    unionUndefined: true,
    apiFile: './fixtures/emptyApi.ts',
    schemaFile: resolve(__dirname, 'fixtures/petstore.json'),
    filterEndpoints: ['getPetById', 'addPet'],
    hooks: true,
  });
  expect(api).toContain('useGetPetByIdQuery');
  expect(api).toContain('useAddPetMutation');
  expect(api).toMatchSnapshot(
    'should generate an `useGetPetByIdQuery` query hook and an `useAddPetMutation` mutation hook'
  );
});

it('supports granular hooks generation that includes all query types', async () => {
  const api = await generateEndpoints({
    apiFile: './fixtures/emptyApi.ts',
    schemaFile: resolve(__dirname, 'fixtures/petstore.json'),
    filterEndpoints: ['getPetById', 'addPet'],
    hooks: {
      queries: true,
      lazyQueries: true,
      mutations: true,
    },
  });
  expect(api).toContain('useGetPetByIdQuery');
  expect(api).toContain('useLazyGetPetByIdQuery');
  expect(api).toContain('useAddPetMutation');
  expect(api).toMatchSnapshot();
});

it('supports granular hooks generation with only queries', async () => {
  const api = await generateEndpoints({
    apiFile: './fixtures/emptyApi.ts',
    schemaFile: resolve(__dirname, 'fixtures/petstore.json'),
    filterEndpoints: ['getPetById', 'addPet'],
    hooks: {
      queries: true,
      lazyQueries: false,
      mutations: false,
    },
  });
  expect(api).toContain('useGetPetByIdQuery');
  expect(api).not.toContain('useLazyGetPetByIdQuery');
  expect(api).not.toContain('useAddPetMutation');
  expect(api).toMatchSnapshot();
});

it('supports granular hooks generation with only lazy queries', async () => {
  const api = await generateEndpoints({
    apiFile: './fixtures/emptyApi.ts',
    schemaFile: resolve(__dirname, 'fixtures/petstore.json'),
    filterEndpoints: ['getPetById', 'addPet'],
    hooks: {
      queries: false,
      lazyQueries: true,
      mutations: false,
    },
  });
  expect(api).not.toContain('useGetPetByIdQuery');
  expect(api).toContain('useLazyGetPetByIdQuery');
  expect(api).not.toContain('useAddPetMutation');
  expect(api).toMatchSnapshot();
});

it('supports granular hooks generation with only mutations', async () => {
  const api = await generateEndpoints({
    apiFile: './fixtures/emptyApi.ts',
    schemaFile: resolve(__dirname, 'fixtures/petstore.json'),
    filterEndpoints: ['getPetById', 'addPet'],
    hooks: {
      queries: false,
      lazyQueries: false,
      mutations: true,
    },
  });
  expect(api).not.toContain('useGetPetByIdQuery');
  expect(api).not.toContain('useLazyGetPetByIdQuery');
  expect(api).toContain('useAddPetMutation');
  expect(api).toMatchSnapshot();
});

it('falls back to the `title` parameter for the body parameter name when no other name is available', async () => {
  const api = await generateEndpoints({
    apiFile: 'fixtures/emptyApi.ts',
    schemaFile: resolve(__dirname, 'fixtures/title-as-param-name.json'),
  });
  expect(api).not.toContain('queryArg.body');
  expect(api).toContain('queryArg.exportedEntityIds');
  expect(api).toContain('queryArg.rawData');
  expect(api).toMatchSnapshot();
});

test('hooks generation uses overrides', async () => {
  const api = await generateEndpoints({
    unionUndefined: true,
    apiFile: './fixtures/emptyApi.ts',
    schemaFile: resolve(__dirname, 'fixtures/petstore.json'),
    filterEndpoints: 'loginUser',
    endpointOverrides: [
      {
        pattern: 'loginUser',
        type: 'mutation',
      },
    ],
    hooks: true,
  });
  expect(api).not.toContain('useLoginUserQuery');
  expect(api).toContain('useLoginUserMutation');
  expect(api).toMatchSnapshot('should generate an `useLoginMutation` mutation hook');
});

test('should use brackets in a querystring urls arg, when the arg contains full stops', async () => {
  const api = await generateEndpoints({
    unionUndefined: true,
    apiFile: './fixtures/emptyApi.ts',
    schemaFile: resolve(__dirname, 'fixtures/params.json'),
  });
  // eslint-disable-next-line no-template-curly-in-string
  expect(api).toContain('`/api/v1/list/${queryArg["item.id"]}`');
  expect(api).toMatchSnapshot();
});

test('duplicate parameter names must be prefixed with a path or query prefix', async () => {
  const api = await generateEndpoints({
    unionUndefined: true,
    apiFile: './fixtures/emptyApi.ts',
    schemaFile: resolve(__dirname, 'fixtures/params.json'),
  });
  // eslint-disable-next-line no-template-curly-in-string
  expect(api).toContain('pathSomeName: string');
  expect(api).toContain('querySomeName: string');
  expect(api).toMatchSnapshot();
});

test('apiImport builds correct `import` statement', async () => {
  const api = await generateEndpoints({
    unionUndefined: true,
    apiFile: './fixtures/emptyApi.ts',
    schemaFile: resolve(__dirname, 'fixtures/params.json'),
    filterEndpoints: [],
    apiImport: 'myApi',
  });
  expect(api).toContain('myApi as api');
});

describe('import paths', () => {
  test('should create paths relative to `outFile` when `apiFile` is relative (different folder)', async () => {
    await generateEndpoints({
      unionUndefined: true,
      apiFile: './fixtures/emptyApi.ts',
      outputFile: './test/tmp/out.ts',
      schemaFile: resolve(__dirname, 'fixtures/petstore.json'),
      filterEndpoints: [],
      hooks: true,
      tag: true,
    });
    expect(await fs.promises.readFile('./test/tmp/out.ts', 'utf8')).toContain(
      "import { api } from '../../fixtures/emptyApi'"
    );
  });

  test('should create paths relative to `outFile` when `apiFile` is relative (same folder)', async () => {
    await fs.promises.writeFile('./test/tmp/emptyApi.ts', await fs.promises.readFile('./test/fixtures/emptyApi.ts'));

    await generateEndpoints({
      unionUndefined: true,
      apiFile: './test/tmp/emptyApi.ts',
      outputFile: './test/tmp/out.ts',
      schemaFile: resolve(__dirname, 'fixtures/petstore.json'),
      filterEndpoints: [],
      hooks: true,
      tag: true,
    });
    expect(await fs.promises.readFile('./test/tmp/out.ts', 'utf8')).toContain("import { api } from './emptyApi'");
  });
});

describe('yaml parsing', () => {
  it('should parse a yaml schema from a URL', async () => {
    const result = await generateEndpoints({
      unionUndefined: true,
      apiFile: './tmp/emptyApi.ts',
      schemaFile: 'https://petstore3.swagger.io/api/v3/openapi.yaml',
      hooks: true,
      tag: true,
    });
    expect(result).toMatchSnapshot();
  });

  it('should be able to use read a yaml file', async () => {
    const result = await generateEndpoints({
      unionUndefined: true,
      apiFile: './tmp/emptyApi.ts',
      schemaFile: `./test/fixtures/petstore.yaml`,
      hooks: true,
      tag: true,
    });
    expect(result).toMatchSnapshot();
  });

  it("should generate params with non quoted keys if they don't contain special characters", async () => {
    const output = await generateEndpoints({
      unionUndefined: true,
      apiFile: './tmp/emptyApi.ts',
      schemaFile: './test/fixtures/fhir.yaml',
      hooks: true,
      tag: true,
    });

    expect(output).toMatchSnapshot();

    expect(output).toContain('foo: queryArg.foo,');
    expect(output).toContain('_foo: queryArg._foo,');
    expect(output).toContain('_bar_bar: queryArg._bar_bar,');
    expect(output).toContain('foo_bar: queryArg.fooBar,');
    expect(output).toContain('namingConflict: queryArg.namingConflict,');
    expect(output).toContain('naming_conflict: queryArg.naming_conflict,');
  });

  it('should generate params with quoted keys if they contain special characters', async () => {
    const output = await generateEndpoints({
      unionUndefined: true,
      apiFile: './tmp/emptyApi.ts',
      schemaFile: './test/fixtures/fhir.yaml',
      hooks: true,
      tag: true,
    });

    expect(output).toContain('"-bar-bar": queryArg["-bar-bar"],');
    expect(output).toContain('"foo:bar-foo.bar/foo": queryArg["foo:bar-foo.bar/foo"],');
  });
});

describe('tests from issues', () => {
  it('issue #2002: should be able to generate proper intersection types', async () => {
    const result = await generateEndpoints({
      apiFile: './tmp/emptyApi.ts',
      schemaFile: './test/fixtures/issue-2002.json',
      hooks: true,
    });
    expect(result).toMatchSnapshot();
  });
});

describe('openapi spec', () => {
  it('readOnly / writeOnly are respected', async () => {
    const api = await generateEndpoints({
      unionUndefined: true,
      schemaFile: './test/fixtures/readOnlyWriteOnly.yaml',
      apiFile: './fixtures/emptyApi.ts',
    });
    expect(api).toMatchSnapshot();
  });
});

describe('openapi spec', () => {
  it('readOnly / writeOnly are merged', async () => {
    const api = await generateEndpoints({
      unionUndefined: true,
      schemaFile: './test/fixtures/readOnlyWriteOnly.yaml',
      apiFile: './fixtures/emptyApi.ts',
      mergeReadWriteOnly: true,
    });
    expect(api).toMatchSnapshot();
  });
});
