import { exec, ExecException } from 'child_process';
import * as fs from 'fs';
import path from 'path';
import del from 'del';

import { MESSAGES } from '../src/utils';

let id = 0;
const tmpDir = 'test/tmp';

function getTmpFileName() {
  return path.resolve(tmpDir, `${++id}.test.generated.ts`);
}

function copyAndGetTmpFileName(fileToCopyPath: string, newFileName: string): string {
  newFileName = `${++id}.test.${newFileName}`;
  const newFilePath = path.resolve(tmpDir, newFileName);
  fs.copyFileSync(fileToCopyPath, newFilePath, fs.constants.COPYFILE_EXCL);
  return newFileName;
}

function cli(args: string[], cwd: string): Promise<{ error: ExecException | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    exec(
      `ts-node -T -P ${path.resolve('./tsconfig.json')} ${path.resolve('./src/bin/cli.ts')} ${args.join(' ')}`,
      { cwd },
      (error, stdout, stderr) => {
        resolve({
          error,
          stdout,
          stderr,
        });
      }
    );
  });
}

beforeAll(() => {
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir);
  }
});

afterAll(() => {
  del.sync(`${tmpDir}/*.ts`);
});

describe('CLI options testing', () => {
  it('should log output to the console when a filename is not specified', async () => {
    const result = await cli([`./test/fixtures/petstore.json`], '.');
    expect(result.stdout).toMatchSnapshot();
  });

  it('should accept a valid url as the target swagger file and generate a client', async () => {
    const result = await cli([`https://petstore3.swagger.io/api/v3/openapi.json`], '.');
    expect(result.stdout).toMatchSnapshot();
  });

  it('should generate react hooks as a part of the output', async () => {
    const result = await cli(['-h', `./test/fixtures/petstore.json`], '.');
    expect(result.stdout).toMatchSnapshot();

    // These are all of the hooks that we expect the petstore schema to output
    const expectedHooks = [
      'useGetHealthcheckQuery',
      'useUpdatePetMutation',
      'useAddPetMutation',
      'useFindPetsByStatusQuery',
      'useFindPetsByTagsQuery',
      'useGetPetByIdQuery',
      'useUpdatePetWithFormMutation',
      'useDeletePetMutation',
      'useUploadFileMutation',
      'useGetInventoryQuery',
      'usePlaceOrderMutation',
      'useGetOrderByIdQuery',
      'useDeleteOrderMutation',
      'useCreateUserMutation',
      'useCreateUsersWithListInputMutation',
      'useLoginUserQuery',
      'useLogoutUserQuery',
      'useGetUserByNameQuery',
      'useUpdateUserMutation',
      'useDeleteUserMutation',
    ];

    const numberOfHooks = expectedHooks.filter((name) => result.stdout.indexOf(name) > -1).length;
    expect(numberOfHooks).toEqual(expectedHooks.length);
  });

  it('should contain the right imports when using hooks and a custom base query', async () => {
    const result = await cli(
      ['-h', `--baseQuery`, `test/fixtures/customBaseQuery.ts:anotherNamedBaseQuery`, `./test/fixtures/petstore.json`],
      '.'
    );

    expect(result.stdout).toContain(`import { createApi } from \"@reduxjs/toolkit/query/react\";`);
    expect(result.stdout).toContain(`import { anotherNamedBaseQuery } from \"test/fixtures/customBaseQuery\";`);
  });

  it('should call fetchBaseQuery with the url provided to --baseUrl', async () => {
    const result = await cli([`--baseUrl`, `http://swagger.io`, `./test/fixtures/petstore.json`], '.');

    const output = result.stdout;

    expect(output).toContain('baseQuery: fetchBaseQuery({ baseUrl: "http://swagger.io" }),');
  });

  it('should assign the specified baseQueryFn provided to --baseQuery', async () => {
    const result = await cli(
      [`--baseQuery`, `test/fixtures/customBaseQuery.ts:anotherNamedBaseQuery`, `./test/fixtures/petstore.json`],
      '.'
    );

    const output = result.stdout;

    expect(output).not.toContain('fetchBaseQuery');
    expect(output).toContain('baseQuery: anotherNamedBaseQuery,');
  });

  it('should show a warning and ignore --baseUrl when specified along with --baseQuery', async () => {
    const result = await cli(
      [
        `--baseQuery`,
        `test/fixtures/customBaseQuery.ts:anotherNamedBaseQuery`,
        `--baseUrl`,
        `http://swagger.io`,
        `./test/fixtures/petstore.json`,
      ],
      '.'
    );

    const output = result.stdout;

    const expectedWarnings = [MESSAGES.BASE_URL_IGNORED];

    const numberOfWarnings = expectedWarnings.filter((msg) => result.stderr.indexOf(msg) > -1).length;
    expect(numberOfWarnings).toEqual(expectedWarnings.length);

    expect(output).not.toContain('fetchBaseQuery');
    expect(output).toContain('baseQuery: anotherNamedBaseQuery,');
  });

  it('should error out when the specified filename provided to --baseQuery is not found', async () => {
    const result = await cli(
      ['-h', `--baseQuery`, `test/fixtures/nonExistantFile.ts`, `./test/fixtures/petstore.json`],
      '.'
    );
    const expectedErrors = [MESSAGES.FILE_NOT_FOUND];

    const numberOfErrors = expectedErrors.filter((msg) => result.stderr.indexOf(msg) > -1).length;
    expect(numberOfErrors).toEqual(expectedErrors.length);
  });

  it('should error out when the specified filename provided to --baseQuery has no default export', async () => {
    const result = await cli(
      ['-h', `--baseQuery`, `test/fixtures/customBaseQueryWithoutDefault.ts`, `./test/fixtures/petstore.json`],
      '.'
    );

    const expectedErrors = [MESSAGES.DEFAULT_EXPORT_MISSING];

    const numberOfErrors = expectedErrors.filter((msg) => result.stderr.indexOf(msg) > -1).length;
    expect(numberOfErrors).toEqual(expectedErrors.length);
  });

  it('should error out when the named function provided to --baseQuery is not found', async () => {
    const result = await cli(
      ['-h', `--baseQuery`, `test/fixtures/customBaseQuery.ts:missingFunctionName`, `./test/fixtures/petstore.json`],
      '.'
    );

    const expectedErrors = [MESSAGES.NAMED_EXPORT_MISSING];

    const numberOfErrors = expectedErrors.filter((msg) => result.stderr.indexOf(msg) > -1).length;
    expect(numberOfErrors).toEqual(expectedErrors.length);
  });

  it('should not error when a valid named export is provided to --baseQuery', async () => {
    const result = await cli(
      ['-h', `--baseQuery`, `test/fixtures/customBaseQuery.ts:anotherNamedBaseQuery`, `./test/fixtures/petstore.json`],
      '.'
    );

    expect(result.stdout).not.toContain('fetchBaseQuery');
    expect(result.stdout).toContain(`import { anotherNamedBaseQuery } from \"test/fixtures/customBaseQuery\"`);

    const expectedErrors = [MESSAGES.NAMED_EXPORT_MISSING];

    const numberOfErrors = expectedErrors.filter((msg) => result.stderr.indexOf(msg) > -1).length;
    expect(numberOfErrors).toEqual(0);
  });

  it('should not error when a valid named export is provided to --baseQuery with --file option', async () => {
    const fileName = getTmpFileName();
    const result = await cli(
      [
        '-h',
        `--baseQuery`,
        `test/fixtures/customBaseQuery.ts:anotherNamedBaseQuery`,
        '--file',
        fileName,
        `./test/fixtures/petstore.json`,
      ],
      '.'
    );

    const output = fs.readFileSync(fileName, { encoding: 'utf-8' });

    expect(output).not.toContain('fetchBaseQuery');
    expect(output).toContain(`import { anotherNamedBaseQuery } from '../fixtures/customBaseQuery'`);

    const expectedErrors = [MESSAGES.NAMED_EXPORT_MISSING];

    const numberOfErrors = expectedErrors.filter((msg) => result.stderr.indexOf(msg) > -1).length;
    expect(numberOfErrors).toEqual(0);
  });

  it('should import { default as customBaseQuery } when a file with a default export is provided to --baseQuery', async () => {
    const result = await cli(
      ['-h', `--baseQuery`, `test/fixtures/customBaseQuery.ts`, `./test/fixtures/petstore.json`],
      '.'
    );

    expect(result.stdout).not.toContain('fetchBaseQuery');
    expect(result.stdout).toContain(`import { default as customBaseQuery } from \"test/fixtures/customBaseQuery\"`);

    const expectedErrors = [MESSAGES.NAMED_EXPORT_MISSING];

    const numberOfErrors = expectedErrors.filter((msg) => result.stderr.indexOf(msg) > -1).length;
    expect(numberOfErrors).toEqual(0);
  });

  it("should import { default as customBaseQuery } from './customBaseQuery' when a local customBaseQuery is provided to --baseQuery", async () => {
    const localBaseQueryName = copyAndGetTmpFileName('./test/fixtures/customBaseQuery.ts', 'localCustomBaseQuery.ts');
    const fileName = getTmpFileName();
    const result = await cli(
      [
        '-h',
        `--baseQuery`,
        `./test/tmp/${localBaseQueryName}:namedBaseQuery`,
        '--file',
        fileName,
        `./test/fixtures/petstore.json`,
      ],
      '.'
    );

    const output = fs.readFileSync(fileName, { encoding: 'utf-8' });

    const strippedLocalBaseQueryName = path.parse(localBaseQueryName).name;

    expect(output).not.toContain('fetchBaseQuery');
    expect(output).toContain(`import { namedBaseQuery } from './${strippedLocalBaseQueryName}'`);

    const expectedErrors = [MESSAGES.NAMED_EXPORT_MISSING];

    const numberOfErrors = expectedErrors.filter((msg) => result.stderr.indexOf(msg) > -1).length;
    expect(numberOfErrors).toEqual(0);
  });

  it('should error out when the specified with path alias is not found', async () => {
    const result = await cli(
      ['-h', `--baseQuery`, `@/hoge/fuga/nonExistantFile`, `./test/fixtures/petstore.json`],
      '.'
    );
    const expectedErrors = [MESSAGES.FILE_NOT_FOUND];

    const numberOfErrors = expectedErrors.filter((msg) => result.stderr.indexOf(msg) > -1).length;
    expect(numberOfErrors).toEqual(expectedErrors.length);
  });

  it('should throw the correct error when a specified tsconfig is not found', async () => {
    const pathAlias = '@/customBaseQuery';
    const result = await cli(
      [
        '-h',
        `--baseQuery`,
        `${pathAlias}:anotherNamedBaseQuery`,
        '-c',
        'test/missing/tsconfig.json',
        `./test/fixtures/petstore.json`,
      ],
      '.'
    );

    const expectedErrors = [MESSAGES.TSCONFIG_FILE_NOT_FOUND];

    const numberOfErrors = expectedErrors.filter((msg) => result.stderr.indexOf(msg) > -1).length;
    expect(numberOfErrors).toEqual(expectedErrors.length);
  });

  it('should work with path alias', async () => {
    const pathAlias = '@/customBaseQuery';
    const result = await cli(
      [
        '-h',
        `--baseQuery`,
        `${pathAlias}:anotherNamedBaseQuery`,
        '-c',
        'test/tsconfig.json',
        `./test/fixtures/petstore.json`,
      ],
      '.'
    );

    expect(result.stdout).not.toContain('fetchBaseQuery');
    expect(result.stdout).toContain(`import { anotherNamedBaseQuery } from \"${pathAlias}\"`);

    const expectedErrors = [MESSAGES.NAMED_EXPORT_MISSING];

    const numberOfErrors = expectedErrors.filter((msg) => result.stderr.indexOf(msg) > -1).length;
    expect(numberOfErrors).toEqual(0);
  });

  it('should work with path alias with file extension', async () => {
    const pathAlias = '@/customBaseQuery';
    const result = await cli(
      [
        '-h',
        `--baseQuery`,
        `${pathAlias}.ts:anotherNamedBaseQuery`,
        '-c',
        'test/tsconfig.json',
        `./test/fixtures/petstore.json`,
      ],
      '.'
    );

    expect(result.stdout).not.toContain('fetchBaseQuery');
    expect(result.stdout).toContain(`import { anotherNamedBaseQuery } from \"${pathAlias}\"`);

    const expectedErrors = [MESSAGES.NAMED_EXPORT_MISSING];

    const numberOfErrors = expectedErrors.filter((msg) => result.stderr.indexOf(msg) > -1).length;
    expect(numberOfErrors).toEqual(0);
  });

  it('should create a file when --file is specified', async () => {
    const fileName = getTmpFileName();
    await cli([`--file ${fileName}`, `../fixtures/petstore.json`], tmpDir);

    expect(fs.readFileSync(fileName, { encoding: 'utf-8' })).toMatchSnapshot();
  });
});

describe('yaml parsing', () => {
  it('should parse a yaml schema from a URL', async () => {
    const result = await cli([`https://petstore3.swagger.io/api/v3/openapi.yaml`], '.');
    expect(result.stdout).toMatchSnapshot();
  });

  it('should be able to use read a yaml file and create a file with the output when --file is specified', async () => {
    const fileName = getTmpFileName();
    await cli([`--file ${fileName}`, `../fixtures/petstore.yaml`], tmpDir);

    expect(fs.readFileSync(fileName, { encoding: 'utf-8' })).toMatchSnapshot();
  });
});
