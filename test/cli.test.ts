import { exec, ExecException } from 'child_process';
import * as fs from 'fs';
import path from 'path';
import del from 'del';

import { MESSAGES } from '../src/utils';

const GENERATED_FILE_NAME = `test.generated.ts`;
const tmpDir = 'test/tmp';

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

  it('should error out when the specified filename provided to --baseQuery is not found', async () => {
    const result = await cli(
      ['-h', `--baseQuery test/fixtures/nonExistantFile.ts`, `./test/fixtures/petstore.json`],
      '.'
    );

    const expectedErrors = [MESSAGES.FILE_NOT_FOUND];

    const numberOfErrors = expectedErrors.filter((msg) => result.stderr.indexOf(msg) > -1).length;
    expect(numberOfErrors).toEqual(expectedErrors.length);
  });

  it('should error out when the specified filename provided to --baseQuery has no default export', async () => {
    const result = await cli(
      ['-h', `--baseQuery test/fixtures/customBaseQueryWithoutDefault.ts`, `./test/fixtures/petstore.json`],
      '.'
    );

    const expectedErrors = [MESSAGES.DEFAULT_EXPORT_MISSING];

    const numberOfErrors = expectedErrors.filter((msg) => result.stderr.indexOf(msg) > -1).length;
    expect(numberOfErrors).toEqual(expectedErrors.length);
  });

  it('should error out when the named function provided to --baseQuery is not found', async () => {
    const result = await cli(
      ['-h', `--baseQuery test/fixtures/customBaseQuery.ts:missingFunctionName`, `./test/fixtures/petstore.json`],
      '.'
    );

    const expectedErrors = [MESSAGES.NAMED_EXPORT_MISSING];

    const numberOfErrors = expectedErrors.filter((msg) => result.stderr.indexOf(msg) > -1).length;
    expect(numberOfErrors).toEqual(expectedErrors.length);
  });

  it('should not error when a valid named export is provided to --baseQuery', async () => {
    const result = await cli(
      ['-h', `--baseQuery test/fixtures/customBaseQuery.ts:anotherNamedBaseQuery`, `./test/fixtures/petstore.json`],
      '.'
    );

    expect(result.stdout).not.toContain('fetchBaseQuery');
    expect(result.stdout).toContain(`import { anotherNamedBaseQuery } from \"test/fixtures/customBaseQuery\"`);

    const expectedErrors = [MESSAGES.NAMED_EXPORT_MISSING];

    const numberOfErrors = expectedErrors.filter((msg) => result.stderr.indexOf(msg) > -1).length;
    expect(numberOfErrors).toEqual(0);
  });

  it('should import { default as customBaseQuery } when a file with a default export is provided to --baseQuery', async () => {
    const result = await cli(
      ['-h', `--baseQuery test/fixtures/customBaseQuery.ts`, `./test/fixtures/petstore.json`],
      '.'
    );

    expect(result.stdout).not.toContain('fetchBaseQuery');
    expect(result.stdout).toContain(`import { default as customBaseQuery } from \"test/fixtures/customBaseQuery\"`);

    const expectedErrors = [MESSAGES.NAMED_EXPORT_MISSING];

    const numberOfErrors = expectedErrors.filter((msg) => result.stderr.indexOf(msg) > -1).length;
    expect(numberOfErrors).toEqual(0);
  });

  it('should create a file when --file is specified', async () => {
    await cli([`--file ${GENERATED_FILE_NAME}`, `../fixtures/petstore.json`], tmpDir);

    expect(fs.readFileSync(`${tmpDir}/${GENERATED_FILE_NAME}`, { encoding: 'utf-8' })).toMatchSnapshot();
  });
});

describe('yaml parsing', () => {
  it('should parse a yaml schema from a URL', async () => {
    const result = await cli([`https://petstore3.swagger.io/api/v3/openapi.yaml`], '.');
    expect(result.stdout).toMatchSnapshot();
  });

  it('should be able to use read a yaml file and create a file with the output when --file is specified', async () => {
    await cli([`--file ${GENERATED_FILE_NAME}`, `../fixtures/petstore.yaml`], tmpDir);

    expect(fs.readFileSync(`${tmpDir}/${GENERATED_FILE_NAME}`, { encoding: 'utf-8' })).toMatchSnapshot();
  });
});
