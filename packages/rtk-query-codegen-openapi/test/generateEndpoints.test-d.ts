import { generateEndpoints } from '@rtk-query/codegen-openapi';
import * as path from 'node:path';

const withoutOutputFile = {
  apiFile: './fixtures/emptyApi.ts',
  schemaFile: path.join(__dirname, 'fixtures', 'petstore.json'),
};

const withOutputFile = {
  apiFile: './fixtures/emptyApi.ts',
  outputFile: './test/tmp/out.ts',
  schemaFile: path.join(__dirname, 'fixtures', 'petstore.json'),
};

describe('generateEndpoints return type narrowing', () => {
  test('narrows to Promise<string> when outputFile is omitted', () => {
    expectTypeOf(generateEndpoints(withoutOutputFile)).toEqualTypeOf<Promise<string>>();

    expectTypeOf(generateEndpoints(withoutOutputFile)).resolves.toBeString();

    expectTypeOf(generateEndpoints).toBeCallableWith(withoutOutputFile).returns.resolves.toBeString();
  });

  test('narrows to Promise<void> when outputFile is provided', () => {
    expectTypeOf(generateEndpoints(withOutputFile)).toEqualTypeOf<Promise<void>>();

    expectTypeOf(generateEndpoints(withOutputFile)).resolves.toBeVoid();

    expectTypeOf(generateEndpoints).toBeCallableWith(withOutputFile).returns.resolves.toBeVoid();
  });
});
