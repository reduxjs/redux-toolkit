import { generateEndpoints } from '@rtk-query/codegen-openapi';
import { resolve } from 'node:path';
import ts from 'typescript';

const baseOptions = {
  unionUndefined: true,
  apiFile: './fixtures/emptyApi.ts',
  schemaFile: resolve(__dirname, 'fixtures/multipart.json'),
};

const typecheckOnlyApiSource = `
type EndpointBuilder = {
  mutation: <Response, Arg>(definition: { query?: (queryArg: Arg) => unknown }) => unknown;
};
export declare const api: {
  injectEndpoints: (options: {
    endpoints: (build: EndpointBuilder) => Record<string, unknown>;
    overrideExisting: boolean;
  }) => unknown;
};
`;

function compileGeneratedSource(source: string) {
  const generatedFile = resolve(__dirname, 'generated-typecheck.ts');
  const typecheckOnlyApiFile = resolve(__dirname, 'fixtures/typecheckOnlyApi.ts');
  const virtualFiles = new Map([
    [generatedFile, source],
    [typecheckOnlyApiFile, typecheckOnlyApiSource],
  ]);
  const options: ts.CompilerOptions = {
    strict: true,
    noEmit: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    skipLibCheck: false,
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
    types: [],
  };
  const host = ts.createCompilerHost(options);
  const fileExists = host.fileExists.bind(host);
  const readFile = host.readFile.bind(host);
  const getSourceFile = host.getSourceFile.bind(host);

  host.fileExists = (fileName) => virtualFiles.has(fileName) || fileExists(fileName);
  host.readFile = (fileName) => virtualFiles.get(fileName) ?? readFile(fileName);
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
    const virtualSource = virtualFiles.get(fileName);
    if (virtualSource !== undefined) {
      return ts.createSourceFile(fileName, virtualSource, languageVersion, true);
    }
    return getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
  };

  const program = ts.createProgram([generatedFile], options, host);
  return ts.getPreEmitDiagnostics(program).map((diagnostic) => {
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ');
    if (diagnostic.file && diagnostic.start !== undefined) {
      const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
      return `${diagnostic.file.fileName}:${position.line + 1}:${position.character + 1} TS${diagnostic.code}: ${message}`;
    }
    return `TS${diagnostic.code}: ${message}`;
  });
}

test('multipart/form-data request bodies are converted to FormData', async () => {
  const api = await generateEndpoints({
    ...baseOptions,
    filterEndpoints: ['uploadAvatar'],
  });
  expect(api).toContain('new FormData()');
  expect(api).toContain('for (const [key, value] of Object.entries(queryArg.body))');
  expect(api).toContain('appendToFormData(formData, key, value)');
  // the raw object must not be passed as the body directly
  expect(api).not.toContain('body: queryArg.body');
  expect(api).toMatch(/return \{ url: `\/api\/Avatar`, method: "POST", body: formData \}/);
  expect(api).toMatchSnapshot();
});

test('an optional multipart body still maps to undefined when not provided', async () => {
  const api = await generateEndpoints({
    ...baseOptions,
    filterEndpoints: ['createDocument'],
  });
  expect(api).toContain('new FormData()');
  expect(api).toContain('Object.entries(queryArg.body ?? {})');
  expect(api).toContain('body: queryArg.body === undefined ? undefined : formData');
});

test('json-only request bodies are passed through unchanged and no helper is emitted', async () => {
  const api = await generateEndpoints({
    ...baseOptions,
    filterEndpoints: ['createNote'],
  });
  expect(api).not.toContain('FormData');
  expect(api).not.toContain('appendToFormData');
  expect(api).toContain('body: queryArg.body');
});

test('operations offering both multipart and json content keep the json behavior', async () => {
  const api = await generateEndpoints({
    ...baseOptions,
    filterEndpoints: ['uploadOrJson'],
  });
  expect(api).not.toContain('new FormData()');
  expect(api).not.toContain('appendToFormData');
  expect(api).toContain('body: queryArg.body');
});

test('the FormData conversion helper is emitted only once for several multipart endpoints', async () => {
  const api = await generateEndpoints({
    ...baseOptions,
    filterEndpoints: (name) => name === 'uploadAvatar' || name === 'createDocument',
  });
  const occurrences = api.split('const appendToFormData').length - 1;
  expect(occurrences).toBe(1);
  // both endpoints use it
  expect(api.match(/appendToFormData\(formData, key, value\)/g)?.length).toBe(2);
  expect(api).toMatchSnapshot();
});

test('multipart conversion also applies with flattenArg', async () => {
  const api = await generateEndpoints({
    ...baseOptions,
    flattenArg: true,
    filterEndpoints: ['uploadAvatar'],
  });
  expect(api).toContain('new FormData()');
  expect(api).toContain('for (const [key, value] of Object.entries(queryArg))');
  expect(api).toContain('body: formData');
  expect(api).not.toContain('body: queryArg');
});

test('multipart media type matching is case-insensitive and blob detection is realm-independent', async () => {
  const api = await generateEndpoints({
    ...baseOptions,
    filterEndpoints: ['mixedCaseMultipart'],
  });
  expect(api).toContain('new FormData()');
  expect(api).toContain('Object.entries(queryArg.body)');
  expect(api).toContain('Object.prototype.toString.call(item) === "[object Blob]"');
});

test('multipart serialization uses the multipart schema for the argument type', async () => {
  const api = await generateEndpoints({
    ...baseOptions,
    filterEndpoints: ['textThenMultipart'],
  });
  expect(api).toContain('new FormData()');
  expect(api).toMatch(/export type TextThenMultipartApiArg = \{\s+body: \{\s+file: Blob;/);
  expect(api).not.toMatch(/export type TextThenMultipartApiArg = \{\s+body: string/);
});

test('multipart output compiles when a schema is named FormData', async () => {
  const api = await generateEndpoints({
    ...baseOptions,
    apiFile: './fixtures/typecheckOnlyApi.ts',
    filterEndpoints: ['uploadSchemaNamedFormData'],
  });
  expect(api).toContain('formData: globalThis.FormData');
  expect(api).toMatch(/export type FormData = \{\s+caption: string;/);
  expect(compileGeneratedSource(api)).toEqual([]);
});
