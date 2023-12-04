import { describe, vi } from 'vitest';
import type { Transform } from 'jscodeshift';
import globby from 'globby';
import fs from 'fs-extra';
import path from 'path';
import { runInlineTest } from 'jscodeshift/dist/testUtils';

export function runTransformTest(
  name: string,
  transform: Transform,
  parser: string,
  fixturePath: string
) {
  describe(name, function () {
    globby
      .sync('**/*.input.*', {
        cwd: fixturePath,
        absolute: true,
      })
      .map((entry) => entry.slice(fixturePath.length))
      .forEach((filename) => {
        let extension = path.extname(filename);
        let testName = filename.replace(`.input${extension}`, '');
        let testInputPath = path.join(fixturePath, `${testName}${extension}`);
        let inputPath = path.join(fixturePath, `${testName}.input${extension}`);
        let outputPath = path.join(fixturePath, `${testName}.output${extension}`);
        let optionsPath = path.join(fixturePath, `${testName}.options.json`);
        let options = fs.pathExistsSync(optionsPath) ? fs.readFileSync(optionsPath) : '{}';

        describe(testName, function () {
          beforeEach(function () {
            process.env.CODEMOD_CLI_ARGS = options;
          });

          afterEach(function () {
            process.env.CODEMOD_CLI_ARGS = '';
          });

          it('transforms correctly', function () {
            runInlineTest(
              transform,
              {},
              { path: testInputPath, source: fs.readFileSync(inputPath, 'utf8') },
              fs.readFileSync(outputPath, 'utf8'),
              { parser }
            );
          });

          it('is idempotent', function () {
            runInlineTest(
              transform,
              {},
              { path: testInputPath, source: fs.readFileSync(outputPath, 'utf8') },
              fs.readFileSync(outputPath, 'utf8'),
              { parser }
            );
          });
        });
      });
  });
}
