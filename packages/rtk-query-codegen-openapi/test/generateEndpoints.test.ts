import { generateEndpoints } from '@rtk-query/codegen-openapi';
import fs from 'node:fs/promises';
import path, { resolve } from 'node:path';
import { rimraf } from 'rimraf';
import { isDir, removeTempDir } from './cli.test';

const tmpDir = path.resolve(__dirname, 'tmp');

beforeAll(async () => {
  if (!(await isDir(tmpDir))) {
    await fs.mkdir(tmpDir, { recursive: true });
  }
  return removeTempDir;
});

afterEach(async () => {
  await rimraf(`${tmpDir}/*.ts`, { glob: true });
});

test('calling without `outputFile` returns the generated api', async () => {
  const api = await generateEndpoints({
    unionUndefined: true,
    apiFile: './fixtures/emptyApi.ts',
    schemaFile: resolve(__dirname, 'fixtures/petstore.json'),
  });
  expect(api).toMatchSnapshot();
});

test('should include default response type in request when includeDefault is set to true', async () => {
  const api = await generateEndpoints({
    apiFile: './fixtures/emptyApi.ts',
    schemaFile: resolve(__dirname, 'fixtures/petstore.json'),
    includeDefault: true,
  });
  // eslint-disable-next-line no-template-curly-in-string
  expect(api).toMatch(/export type CreateUserApiResponse =[\s\S/*]+status default successful operation[\s/*]+User;/);
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

describe('endpoint overrides', () => {
  it('overrides endpoint type', async () => {
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

  it('should override parameters by string', async () => {
    const api = await generateEndpoints({
      unionUndefined: true,
      apiFile: './fixtures/emptyApi.ts',
      schemaFile: resolve(__dirname, 'fixtures/petstore.json'),
      endpointOverrides: [
        {
          pattern: /.*/,
          parameterFilter: 'status',
        },
      ],
    });
    expect(api).not.toMatch(/params: {\n.*queryArg\.\w+\b(?<!\bstatus)/);
    expect(api).toMatchSnapshot('should only have the "status" parameter from the endpoints');
  });

  it('should override parameters by regex', async () => {
    const api = await generateEndpoints({
      unionUndefined: true,
      apiFile: './fixtures/emptyApi.ts',
      schemaFile: resolve(__dirname, 'fixtures/petstore.json'),
      endpointOverrides: [
        {
          pattern: /.*/,
          parameterFilter: /e/,
        },
      ],
    });
    expect(api).not.toMatch(/params: {\n.*queryArg\.[^\We]*\W/);
    expect(api).toMatch(/params: {\n.*queryArg\.[\we]*\W/);
    expect(api).toMatchSnapshot('should only have the parameters with an "e"');
  });

  it('should filter by array of parameter strings / regex', async () => {
    const api = await generateEndpoints({
      unionUndefined: true,
      apiFile: './fixtures/emptyApi.ts',
      schemaFile: resolve(__dirname, 'fixtures/petstore.json'),
      endpointOverrides: [
        {
          pattern: /.*/,
          parameterFilter: [/e/, /f/],
        },
      ],
    });
    expect(api).not.toMatch(/params: {\n.*queryArg\.[^\Wef]*\W/);
    expect(api).toMatch(/params: {\n.*queryArg\.[\wef]*\W/);
    expect(api).toMatchSnapshot('should only have the parameters with an "e" or "f"');
  });

  it('should filter by function', async () => {
    const api = await generateEndpoints({
      unionUndefined: true,
      apiFile: './fixtures/emptyApi.ts',
      schemaFile: resolve(__dirname, 'fixtures/petstore.json'),
      endpointOverrides: [
        {
          pattern: /.*/,
          parameterFilter: (_, param) => !(param.in === 'header'),
        },
      ],
    });
    expect(api).not.toMatch(/headers: {/);
    expect(api).toMatchSnapshot('should remove any parameters from the header');
  });

  it('should apply first matching filter only', async () => {
    const api = await generateEndpoints({
      unionUndefined: true,
      apiFile: './fixtures/emptyApi.ts',
      schemaFile: resolve(__dirname, 'fixtures/petstore.json'),
      endpointOverrides: [
        { pattern: 'findPetsByStatus', parameterFilter: () => true },
        {
          pattern: /.*/,
          parameterFilter: () => false,
        },
      ],
    });

    const paramsMatches = (api?.match(/params:/) || []).length;
    expect(paramsMatches).toBe(1);
    expect(api).not.toMatch(/headers: {/);
    expect(api).toMatchSnapshot('should remove all parameters except for findPetsByStatus');
  });
});

describe('option encodePathParams', () => {
  const config = {
    apiFile: './fixtures/emptyApi.ts',
    schemaFile: resolve(__dirname, 'fixtures/petstore.json'),
    encodePathParams: true,
  };

  it('should encode path parameters', async () => {
    const api = await generateEndpoints({
      ...config,
      filterEndpoints: ['getOrderById'],
    });
    // eslint-disable-next-line no-template-curly-in-string
    expect(api).toContain('`/store/order/${encodeURIComponent(String(queryArg.orderId))}`');
  });

  it('should not encode query parameters', async () => {
    const api = await generateEndpoints({
      ...config,
      filterEndpoints: ['findPetsByStatus'],
    });
    expect(api).toContain('status: queryArg.status');
  });

  it('should not encode body parameters', async () => {
    const api = await generateEndpoints({
      ...config,
      filterEndpoints: ['addPet'],
    });
    expect(api).toContain('body: queryArg.pet');
    expect(api).not.toContain('body: encodeURIComponent(String(queryArg.pet))');
  });

  it('should work correctly with flattenArg option', async () => {
    const api = await generateEndpoints({
      ...config,
      flattenArg: true,
      filterEndpoints: ['getOrderById'],
    });
    // eslint-disable-next-line no-template-curly-in-string
    expect(api).toContain('`/store/order/${encodeURIComponent(String(queryArg))}`');
  });

  it('should not encode path parameters when encodePathParams is false', async () => {
    const api = await generateEndpoints({
      ...config,
      encodePathParams: false,
      filterEndpoints: ['findPetsByStatus', 'getOrderById'],
    });
    // eslint-disable-next-line no-template-curly-in-string
    expect(api).toContain('`/store/order/${queryArg.orderId}`');
  });
});

describe('option encodeQueryParams', () => {
  const config = {
    apiFile: './fixtures/emptyApi.ts',
    schemaFile: resolve(__dirname, 'fixtures/petstore.json'),
    encodeQueryParams: true,
  };

  it('should conditionally encode query parameters', async () => {
    const api = await generateEndpoints({
      ...config,
      filterEndpoints: ['findPetsByStatus'],
    });

    expect(api).toMatch(
      /params:\s*{\s*\n\s*status:\s*queryArg\.status\s*!=\s*null\s*\?\s*encodeURIComponent\(\s*String\(queryArg\.status\)\s*\)\s*:\s*undefined\s*,?\s*\n\s*}/s
    );
  });

  it('should not encode path parameters', async () => {
    const api = await generateEndpoints({
      ...config,
      filterEndpoints: ['getOrderById'],
    });
    // eslint-disable-next-line no-template-curly-in-string
    expect(api).toContain('`/store/order/${queryArg.orderId}`');
  });

  it('should not encode body parameters', async () => {
    const api = await generateEndpoints({
      ...config,
      filterEndpoints: ['addPet'],
    });
    expect(api).toContain('body: queryArg.pet');
    expect(api).not.toContain('body: encodeURIComponent(String(queryArg.pet))');
  });

  it('should not encode query parameters when encodeQueryParams is false', async () => {
    const api = await generateEndpoints({
      ...config,
      encodeQueryParams: false,
      filterEndpoints: ['findPetsByStatus', 'getOrderById'],
    });
    expect(api).toContain('status: queryArg.status');
  });
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
    expect(api).toContain('status: queryArg');
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

  it('should flatten an optional arg as an optional type', async () => {
    const api = await generateEndpoints({
      ...config,
      filterEndpoints: 'findPetsByTags',
    });
    expect(api).toMatch(/\| undefined/);
  });

  it('should not flatten a non-optional arg with a superfluous union', async () => {
    const api = await generateEndpoints({
      ...config,
      filterEndpoints: 'getPetById',
    });
    expect(api).not.toMatch(/^\s*\|/);
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

test('hooks generation with operationNameSuffix', async () => {
  const api = await generateEndpoints({
    unionUndefined: true,
    apiFile: './fixtures/emptyApi.ts',
    schemaFile: resolve(__dirname, 'fixtures/petstore.json'),
    filterEndpoints: ['getPetById', 'addPet'],
    hooks: true,
    operationNameSuffix: 'MySuffix',
  });
  expect(api).toContain('useGetPetByIdMySuffixQuery');
  expect(api).toContain('useAddPetMySuffixMutation');
  expect(api).toMatchSnapshot(
    'should generate an `useGetPetByIdMySuffixQuery` query hook and an `useAddPetMySuffixMutation` mutation hook'
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

test('operation suffixes are applied', async () => {
  const api = await generateEndpoints({
    unionUndefined: true,
    apiFile: './fixtures/emptyApi.ts',
    schemaFile: resolve(__dirname, 'fixtures/petstore.json'),
    operationNameSuffix: 'V2',
  });

  expect(api).toContain('AddPetV2');
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
  beforeAll(async () => {
    if (!(await isDir(tmpDir))) {
      await fs.mkdir(tmpDir, { recursive: true });
    }
  });

  afterEach(async () => {
    await rimraf(`${tmpDir}/*.ts`, { glob: true });
  });

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
    expect(await fs.readFile('./test/tmp/out.ts', 'utf8')).toContain("import { api } from '../../fixtures/emptyApi'");
  });

  test('should create paths relative to `outFile` when `apiFile` is relative (same folder)', async () => {
    await fs.writeFile('./test/tmp/emptyApi.ts', await fs.readFile('./test/fixtures/emptyApi.ts', 'utf8'));

    await generateEndpoints({
      unionUndefined: true,
      apiFile: './test/tmp/emptyApi.ts',
      outputFile: './test/tmp/out.ts',
      schemaFile: resolve(__dirname, 'fixtures/petstore.json'),
      filterEndpoints: [],
      hooks: true,
      tag: true,
    });
    expect(await fs.readFile('./test/tmp/out.ts', 'utf8')).toContain("import { api } from './emptyApi'");
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

describe('query parameters', () => {
  it('parameters overridden in swagger should also be overridden in the code', async () => {
    const api = await generateEndpoints({
      schemaFile: './test/fixtures/parameterOverride.yaml',
      apiFile: './fixtures/emptyApi.ts',
    });
    expect(api).toMatchSnapshot();
  });
});

describe('esmExtensions option', () => {
  beforeAll(async () => {
    if (!(await isDir(tmpDir))) {
      await fs.mkdir(tmpDir, { recursive: true });
    }
  });

  afterEach(async () => {
    await rimraf(`${tmpDir}/*.ts`, { glob: true });
  });

  test('should convert .ts to .js when esmExtensions is true', async () => {
    await generateEndpoints({
      apiFile: './fixtures/emptyApi.ts',
      outputFile: './test/tmp/out.ts',
      schemaFile: resolve(__dirname, 'fixtures/petstore.json'),
      filterEndpoints: [],
      esmExtensions: true,
    });
    const content = await fs.readFile('./test/tmp/out.ts', 'utf8');
    expect(content).toContain("import { api } from '../../fixtures/emptyApi.js'");
  });

  test('should convert .mts to .mjs when esmExtensions is true', async () => {
    await generateEndpoints({
      apiFile: './fixtures/emptyApi.mts',
      outputFile: './test/tmp/out.ts',
      schemaFile: resolve(__dirname, 'fixtures/petstore.json'),
      filterEndpoints: [],
      esmExtensions: true,
    });
    const content = await fs.readFile('./test/tmp/out.ts', 'utf8');
    expect(content).toContain("import { api } from '../../fixtures/emptyApi.mjs'");
  });

  test('should preserve .jsx when esmExtensions is true', async () => {
    await generateEndpoints({
      apiFile: './fixtures/emptyApi.jsx',
      outputFile: './test/tmp/out.ts',
      schemaFile: resolve(__dirname, 'fixtures/petstore.json'),
      filterEndpoints: [],
      esmExtensions: true,
    });
    const content = await fs.readFile('./test/tmp/out.ts', 'utf8');
    expect(content).toContain("import { api } from '../../fixtures/emptyApi.jsx'");
  });

  test('should convert .tsx to .jsx when esmExtensions is true', async () => {
    await generateEndpoints({
      apiFile: './fixtures/emptyApi.tsx',
      outputFile: './test/tmp/out.ts',
      schemaFile: resolve(__dirname, 'fixtures/petstore.json'),
      filterEndpoints: [],
      esmExtensions: true,
    });
    const content = await fs.readFile('./test/tmp/out.ts', 'utf8');
    expect(content).toContain("import { api } from '../../fixtures/emptyApi.jsx'");
  });

  test('should strip extensions when esmExtensions is false', async () => {
    await generateEndpoints({
      apiFile: './fixtures/emptyApi.ts',
      outputFile: './test/tmp/out.ts',
      schemaFile: resolve(__dirname, 'fixtures/petstore.json'),
      filterEndpoints: [],
      esmExtensions: false,
    });
    const content = await fs.readFile('./test/tmp/out.ts', 'utf8');
    expect(content).toContain("import { api } from '../../fixtures/emptyApi'");
  });

  test('should strip extensions when esmExtensions is undefined (default)', async () => {
    await generateEndpoints({
      apiFile: './fixtures/emptyApi.ts',
      outputFile: './test/tmp/out.ts',
      schemaFile: resolve(__dirname, 'fixtures/petstore.json'),
      filterEndpoints: [],
    });
    const content = await fs.readFile('./test/tmp/out.ts', 'utf8');
    expect(content).toContain("import { api } from '../../fixtures/emptyApi'");
  });
});
