import del from 'del';
import type { ExecException } from 'node:child_process';
import { exec } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function cli(args: string[], cwd: string): Promise<{ error: ExecException | null; stdout: string; stderr: string }> {
  const pwd = process.env?.PWD || '.';
  const cmd = `yarn cli ${args.join(' ')}`;
  return new Promise((resolve) => {
    exec(cmd, { cwd }, (error, stdout, stderr) => {
      resolve({
        error,
        stdout,
        stderr,
      });
    });
  });
}

const tmpDir = path.resolve(__dirname, 'tmp');

describe('CLI options testing', () => {
  beforeAll(() => {
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    del.sync(`${tmpDir}/*.ts`);
  });

  test('generation with `config.example.js`', async () => {
    const out = await cli(['./test/config.example.js'], __dirname);

    expect(out).toEqual({
      stdout: `Generating ./tmp/example.ts
Done
`,
      stderr: '',
      error: null,
    });

    expect(fs.readFileSync(path.resolve(tmpDir, 'example.ts'), 'utf-8')).toMatchSnapshot();
  }, 25_000);

  test('paths are relative to config file, not to cwd', async () => {
    const out = await cli([`./test/config.example.js`], __dirname);

    expect(out).toEqual({
      stdout: `Generating ./tmp/example.ts
Done
`,
      stderr: '',
      error: null,
    });

    expect(fs.readFileSync(path.resolve(tmpDir, 'example.ts'), 'utf-8')).toMatchSnapshot();
  }, 25_000);

  test('ts, js and json all work the same', async () => {
    await cli([`./test/config.example.js`], __dirname);
    const fromJs = fs.readFileSync(path.resolve(tmpDir, 'example.ts'), 'utf-8');
    await cli([`./test/config.example.ts`], __dirname);
    const fromTs = fs.readFileSync(path.resolve(tmpDir, 'example.ts'), 'utf-8');
    await cli([`./test/config.example.json`], __dirname);
    const fromJson = fs.readFileSync(path.resolve(tmpDir, 'example.ts'), 'utf-8');

    expect(fromTs).toEqual(fromJs);
    expect(fromJson).toEqual(fromJs);
  }, 120_000);

  test("missing parameters doesn't fail", async () => {
    const out = await cli([`./test/config.invalid-example.json`], __dirname);
    expect(out.stderr).toContain("Error: path parameter petId does not seem to be defined in '/pet/{petId}'!");
  }, 25_000);
});
