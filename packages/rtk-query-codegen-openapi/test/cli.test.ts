import { exec as _exec } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { rimraf } from 'rimraf';

const exec = promisify(_exec);

const cliPath = process.env.CI ? 'rtk-query-codegen-openapi' : `yarn cli`;

const cli = async (args: string[]) => {
  return await exec(`${cliPath} ${args.join(' ')}`);
};

const tmpDir = path.resolve(__dirname, 'tmp');

export const isDir = async (filePath: string) => {
  try {
    const stat = await fs.lstat(filePath);
    return stat.isDirectory();
  } catch {
    return false;
  }
};

const convertSpecialCharsToHyphens = (str: string) => str.replace(/[^a-zA-Z0-9]+/g, '-');

describe('CLI options testing', () => {
  beforeAll(async () => {
    if (!(await isDir(tmpDir))) {
      await fs.mkdir(tmpDir, { recursive: true });
    }
  });

  beforeEach(async ({ task }) => {
    const sanitizedPath = path.join(tmpDir, convertSpecialCharsToHyphens(task.name));
    if (!(await isDir(sanitizedPath))) {
      await fs.mkdir(sanitizedPath, { recursive: true });
    }
  });

  afterEach(async ({ task }) => {
    const sanitizedPath = path.join(tmpDir, convertSpecialCharsToHyphens(task.name));
    await rimraf(sanitizedPath);
  });

  afterAll(async () => {
    await rimraf(tmpDir);
  });

  test('generation with `config.example.js`', async () => {
    const out = await cli(['./test/config.example.js']);

    expect(out).toEqual({
      stdout: `Generating ./tmp/example.ts
Done
`,
      stderr: '',
    });

    expect(await fs.readFile(path.resolve(tmpDir, 'example.ts'), 'utf-8')).toMatchSnapshot();
  }, 25_000);

  test('paths are relative to config file, not to cwd', async () => {
    const out = await cli([`./test/config.example.js`]);

    expect(out).toEqual({
      stdout: `Generating ./tmp/example.ts
Done
`,
      stderr: '',
    });

    expect(await fs.readFile(path.resolve(tmpDir, 'example.ts'), 'utf-8')).toMatchSnapshot();
  }, 25_000);

  test('ts, js and json all work the same', async () => {
    await cli([`./test/config.example.js`]);
    const fromJs = await fs.readFile(path.resolve(tmpDir, 'example.ts'), 'utf-8');
    await cli([`./test/config.example.ts`]);
    const fromTs = await fs.readFile(path.resolve(tmpDir, 'example.ts'), 'utf-8');
    await cli([`./test/config.example.json`]);
    const fromJson = await fs.readFile(path.resolve(tmpDir, 'example.ts'), 'utf-8');

    expect(fromTs).toEqual(fromJs);
    expect(fromJson).toEqual(fromJs);
  }, 120_000);

  test("missing parameters doesn't fail", async () => {
    await expect(() => cli([`./test/config.invalid-example.json`])).rejects.toThrowError(
      "Error: path parameter petId does not seem to be defined in '/pet/{petId}'!"
    );
  }, 25_000);
});
