import { generateEndpoints } from '@rtk-query/codegen-openapi';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
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
function instantiateAppendToFormData(api: string, blobConstructor: unknown = Blob) {
  const helperStart = api.indexOf('const appendToFormData');
  const helperEnd = api.indexOf('const injectedRtkApi');
  const helperJavaScript = ts.transpileModule(api.slice(helperStart, helperEnd), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return new Function('Blob', `${helperJavaScript}; return appendToFormData;`)(blobConstructor) as (
    formData: globalThis.FormData,
    key: string,
    value: unknown,
    contentType?: string
  ) => void;
}

type ForeignRealmBlobConstructor = new (parts?: BlobPart[], options?: BlobPropertyBag) => globalThis.Blob;

function createForeignRealmBlobConstructor(): ForeignRealmBlobConstructor {
  return runInNewContext(
    `
(() => {
  class ForeignBlob extends Blob {}
  for (const key of [
    ...Object.getOwnPropertyNames(Blob.prototype),
    ...Object.getOwnPropertySymbols(Blob.prototype),
  ]) {
    if (key !== 'constructor') {
      Object.defineProperty(ForeignBlob.prototype, key, Object.getOwnPropertyDescriptor(Blob.prototype, key));
    }
  }
  Object.setPrototypeOf(ForeignBlob.prototype, null);
  Object.defineProperty(ForeignBlob.prototype, Symbol.toStringTag, {
    value: 'Blob',
    configurable: true,
  });
  return ForeignBlob;
})()
`,
    { Blob }
  ) as ForeignRealmBlobConstructor;
}

type GeneratedMultipartEndpoints = Record<
  string,
  {
    query: (queryArg: { body: Record<string, unknown> }) => {
      body?: globalThis.FormData;
    };
  }
>;

function instantiateEndpointQueries(api: string) {
  let endpoints: GeneratedMultipartEndpoints = {};
  const builder = {
    query: (definition: unknown) => definition,
    mutation: (definition: unknown) => definition,
  };
  const endpointApi = {
    injectEndpoints(options: { endpoints: (build: typeof builder) => Record<string, unknown> }) {
      endpoints = options.endpoints(builder) as GeneratedMultipartEndpoints;
      return {};
    },
  };
  const compiled = ts.transpileModule(api, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  runInNewContext(compiled.outputText, {
    exports: {},
    require: () => ({ api: endpointApi }),
    FormData,
    Blob,
  });
  return endpoints;
}

async function generateUppercaseNoPartEndpoints() {
  const api = await generateEndpoints({
    ...baseOptions,
    filterEndpoints: ['uppercaseNoPartMultipart'],
  });
  expect(api).toMatch(/key === "optionalUppercase"\s*\?\s*"text\/plain; foo=A"/);
  expect(api).toMatch(/key === "uppercaseList"\s*\?\s*"text\/plain; foo=A"/);
  return instantiateEndpointQueries(api);
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
  expect(api).toContain('body: formData');
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
  expect(api).toContain('Object.prototype.toString.call(part) === "[object Blob]"');
});

test('multipart serialization uses the multipart schema for the argument type', async () => {
  const api = await generateEndpoints({
    ...baseOptions,
    filterEndpoints: ['textThenMultipart'],
  });
  expect(api).toContain('new FormData()');
  expect(api).toMatch(/export type TextThenMultipartApiArg = \{\s+body: \{\s+file: globalThis.Blob;/);
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

test('application/json-seq does not count as an ordinary json content type', async () => {
  const api = await generateEndpoints({
    ...baseOptions,
    filterEndpoints: ['uploadOrJsonSeq'],
  });
  expect(api).toContain('new FormData()');
  expect(api).toContain('appendToFormData(formData, key, value)');
  expect(api).not.toContain('body: queryArg.body');
});

test('operations offering multipart and a structured json suffix use multipart', async () => {
  const api = await generateEndpoints({
    ...baseOptions,
    filterEndpoints: ['uploadOrProblemJson'],
  });
  expect(api).toContain('new FormData()');
  expect(api).toContain('appendToFormData');
  expect(api).not.toContain('body: queryArg.body');
});

test('multipart output compiles when schemas are named FormData and Blob', async () => {
  const api = await generateEndpoints({
    ...baseOptions,
    apiFile: './fixtures/typecheckOnlyApi.ts',
    filterEndpoints: (name) =>
      name === 'uploadAvatar' || name === 'uploadSchemaNamedFormData' || name === 'uploadSchemaNamedBlob',
  });
  expect(api).toContain('formData: globalThis.FormData');
  expect(api).toContain('part is globalThis.Blob');
  expect(api).toMatch(/export type FormData = \{\s+caption: string;/);
  expect(api).toMatch(/export type Blob = \{\s+width: number;/);
  expect(api).toContain('file: globalThis.Blob');
  expect(
    compileGeneratedSource(
      `${api}
const nativeBlobAssignment: UploadAvatarApiArg["body"]["file"] = new Blob([]);
`
    )
  ).toEqual([]);
});

test('multipart encoding content types are passed to the conversion helper', async () => {
  const api = await generateEndpoints({
    ...baseOptions,
    apiFile: './fixtures/typecheckOnlyApi.ts',
    filterEndpoints: ['encodedMultipart'],
  });
  expect(api).toContain('contentType?: string');
  expect(api).toMatch(/key === "metadata"\s*\?\s*"application\/vnd\.custom\+json"/);
  expect(api).toMatch(/key === "label"\s*\?\s*"text\/html; charset=utf-8"/);
  expect(api).toMatch(/key === "file"\s*\?\s*"image\/png"/);
  expect(compileGeneratedSource(api)).toEqual([]);
});

test('an optional multipart body does not allocate FormData when it is absent', async () => {
  const api = await generateEndpoints({
    ...baseOptions,
    filterEndpoints: ['createDocument'],
  });
  expect(api).toMatch(/const formData =\s+queryArg\.body === undefined \? undefined : new FormData\(\)/);
  expect(api).toContain('if (formData !== undefined)');
});

test('explicit multipart content types control serialized parts and preserve file names', async () => {
  const api = await generateEndpoints({
    ...baseOptions,
    filterEndpoints: ['encodedMultipart'],
  });
  const helperStart = api.indexOf('const appendToFormData');
  const helperEnd = api.indexOf('const injectedRtkApi');
  const helperTypeScript = api.slice(helperStart, helperEnd);
  const helperJavaScript = ts.transpileModule(helperTypeScript, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const appendToFormData = new Function(`${helperJavaScript}; return appendToFormData;`)() as (
    formData: globalThis.FormData,
    key: string,
    value: unknown,
    contentType?: string
  ) => void;

  const formData = new FormData();
  appendToFormData(formData, 'metadata', { author: 'a' }, 'application/vnd.custom+json');
  appendToFormData(formData, 'label', 'hello', 'text/html; charset=utf-8');
  appendToFormData(
    formData,
    'file',
    new File(['image'], 'avatar.png', { type: 'application/octet-stream' }),
    'image/png'
  );

  const metadataPart = formData.get('metadata') as Blob;
  expect(metadataPart.type).toBe('application/vnd.custom+json');
  await expect(metadataPart.text()).resolves.toBe('{"author":"a"}');

  const labelPart = formData.get('label') as Blob;
  expect(labelPart.type).toBe('text/html; charset=utf-8');
  await expect(labelPart.text()).resolves.toBe('hello');

  const filePart = formData.get('file') as File;
  expect(filePart.type).toBe('image/png');
  expect(filePart.name).toBe('avatar.png');
  await expect(filePart.text()).resolves.toBe('image');
});

test('explicit multipart content types control scalar part serialization', async () => {
  const api = await generateEndpoints({
    ...baseOptions,
    filterEndpoints: ['encodedMultipart'],
  });
  const helperStart = api.indexOf('const appendToFormData');
  const helperEnd = api.indexOf('const injectedRtkApi');
  const helperJavaScript = ts.transpileModule(api.slice(helperStart, helperEnd), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const appendToFormData = new Function(`${helperJavaScript}; return appendToFormData;`)() as (
    formData: globalThis.FormData,
    key: string,
    value: unknown,
    contentType?: string
  ) => void;

  const formData = new FormData();
  appendToFormData(formData, 'count', 3, 'application/json');
  appendToFormData(formData, 'jsonString', 'hello', 'application/json');
  appendToFormData(formData, 'published', true, 'text/plain');
  appendToFormData(formData, 'label', 'hello', 'text/html');

  const countPart = formData.get('count') as Blob;
  expect(countPart.type).toBe('application/json');
  await expect(countPart.text()).resolves.toBe('3');
  const jsonStringPart = formData.get('jsonString') as Blob;
  expect(jsonStringPart.type).toBe('application/json');
  await expect(jsonStringPart.text()).resolves.toBe('"hello"');
  const publishedPart = formData.get('published') as Blob;
  expect(publishedPart.type).toBe('text/plain');
  await expect(publishedPart.text()).resolves.toBe('true');
  const labelPart = formData.get('label') as Blob;
  expect(labelPart.type).toBe('text/html');
  await expect(labelPart.text()).resolves.toBe('hello');
});

test('wildcard and media type lists are not used as concrete blob types', async () => {
  const api = await generateEndpoints({
    ...baseOptions,
    filterEndpoints: ['encodedMultipart'],
  });
  const helperStart = api.indexOf('const appendToFormData');
  const helperEnd = api.indexOf('const injectedRtkApi');
  const helperJavaScript = ts.transpileModule(api.slice(helperStart, helperEnd), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const appendToFormData = new Function(`${helperJavaScript}; return appendToFormData;`)() as (
    formData: globalThis.FormData,
    key: string,
    value: unknown,
    contentType?: string
  ) => void;

  const formData = new FormData();
  appendToFormData(formData, 'wild', 'hello', 'image/*');
  appendToFormData(formData, 'multi', 'hello', 'text/plain, application/json');
  expect(() => appendToFormData(formData, 'opaque', { value: 'a' }, 'application/octet-stream')).toThrow(
    /Cannot serialize an object multipart part as application\/octet-stream/
  );

  expect(formData.get('wild')).toBe('hello');
  expect(formData.get('multi')).toBe('hello');
  expect(formData.get('opaque')).toBeNull();
});

test('quoted parameter commas are serialized exactly and uppercase parameter values are rejected', async () => {
  const api = await generateEndpoints({
    ...baseOptions,
    filterEndpoints: ['encodedMultipart'],
  });
  const appendToFormData = instantiateAppendToFormData(api);
  const formData = new FormData();
  expect(() => appendToFormData(formData, 'rejected', 'hello', 'text/plain; foo="A,b"')).toThrow(
    /Cannot serialize multipart content type text\/plain; foo="A,b" exactly/
  );
  expect(formData.get('rejected')).toBeNull();
  expect(() => appendToFormData(formData, 'rejected-token', 'hello', 'text/plain; foo=A')).toThrow(
    /Cannot serialize multipart content type text\/plain; foo=A exactly/
  );
  expect(formData.get('rejected-token')).toBeNull();

  appendToFormData(formData, 'quoted', 'hello', 'text/plain; foo="a,b"');
  appendToFormData(formData, 'multi', 'hello', 'text/plain, application/json');

  const request = new Request('https://example.test/upload', { method: 'POST', body: formData });
  const boundary = request.headers.get('content-type')?.split('boundary=')[1];
  expect(boundary).toBeTruthy();
  const serialized = new TextDecoder().decode(await request.arrayBuffer());
  const parts = serialized.split(`--${boundary}`);
  const quotedPart = parts.find((part) => part.includes('name="quoted"'));
  const multiPart = parts.find((part) => part.includes('name="multi"'));

  expect(quotedPart).toBe(
    '\r\nContent-Disposition: form-data; name="quoted"; filename="blob"\r\n' +
      'Content-Type: text/plain; foo="a,b"\r\n\r\nhello\r\n'
  );
  expect(multiPart).toBe('\r\nContent-Disposition: form-data; name="multi"\r\n\r\nhello\r\n');
});

test('uppercase encoding parameters do not reject an undefined field that emits no part', async () => {
  const endpoints = await generateUppercaseNoPartEndpoints();
  const request = endpoints.uppercaseNoPartMultipart.query({
    body: { optionalUppercase: undefined },
  });

  expect(request.body).toBeInstanceOf(FormData);
  expect(Array.from(request.body!.entries())).toEqual([]);
  expect(() =>
    endpoints.uppercaseNoPartMultipart.query({
      body: { optionalUppercase: 'emitted' },
    })
  ).toThrow(/Cannot serialize multipart content type text\/plain; foo=A exactly/);
});

test('uppercase encoding parameters do not reject an empty array that emits no part', async () => {
  const endpoints = await generateUppercaseNoPartEndpoints();
  const request = endpoints.uppercaseNoPartMultipart.query({
    body: { uppercaseList: [] },
  });

  expect(request.body).toBeInstanceOf(FormData);
  expect(Array.from(request.body!.entries())).toEqual([]);
});

test('realm-independent blob conversion preserves bytes', async () => {
  const api = await generateEndpoints({
    ...baseOptions,
    filterEndpoints: ['encodedMultipart'],
  });
  const helperStart = api.indexOf('const appendToFormData');
  const helperEnd = api.indexOf('const injectedRtkApi');
  const helperJavaScript = ts.transpileModule(api.slice(helperStart, helperEnd), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const NativeBlob = Blob;
  function ForeignBlob(this: unknown, parts?: BlobPart[], options?: BlobPropertyBag) {
    return new NativeBlob(parts, options);
  }
  const appendToFormData = new Function('Blob', `${helperJavaScript}; return appendToFormData;`)(ForeignBlob) as (
    formData: globalThis.FormData,
    key: string,
    value: unknown,
    contentType?: string
  ) => void;
  const unchangedPayload = new Uint8Array([0, 1, 2, 127, 128, 255]);
  const unchangedBlob = new NativeBlob([unchangedPayload], { type: 'image/png' });
  expect(unchangedBlob instanceof ForeignBlob).toBe(false);

  const retypedPayload = new Uint8Array([255, 128, 127, 2, 1, 0]);
  const retypedBlob = new NativeBlob([retypedPayload], { type: 'application/octet-stream' });
  expect(retypedBlob instanceof ForeignBlob).toBe(false);

  const appends: Array<[string, unknown]> = [];
  const formData = {
    append: (key: string, item: unknown) => {
      appends.push([key, item]);
    },
  } as unknown as globalThis.FormData;
  appendToFormData(formData, 'unchanged', unchangedBlob, 'image/png');
  appendToFormData(formData, 'retyped', retypedBlob, 'image/png');
  const unchangedPart = appends[0][1] as Blob;
  const retypedPart = appends[1][1] as Blob;

  expect(unchangedPart).toBe(unchangedBlob);
  expect(unchangedPart.type).toBe('image/png');
  expect(Array.from(new Uint8Array(await unchangedPart.arrayBuffer()))).toEqual(Array.from(unchangedPayload));
  expect(retypedPart).not.toBe(retypedBlob);
  expect(retypedPart.type).toBe('image/png');
  expect(Array.from(new Uint8Array(await retypedPart.arrayBuffer()))).toEqual(Array.from(retypedPayload));
});

test('actual foreign-realm blobs preserve bytes on unchanged and retyping paths', async () => {
  const api = await generateEndpoints({
    ...baseOptions,
    filterEndpoints: ['encodedMultipart'],
  });
  const ForeignBlob = createForeignRealmBlobConstructor();
  const SerializerBlob = createForeignRealmBlobConstructor();
  const appendToFormData = instantiateAppendToFormData(api, SerializerBlob);
  const readBlobBytes = async (blob: unknown) => new Uint8Array(await (blob as globalThis.Blob).arrayBuffer());

  const unchangedPayload = new Uint8Array([0, 1, 2, 127, 128, 255]);
  const unchangedForeignBlob = new ForeignBlob([unchangedPayload], { type: 'image/png' });
  expect(unchangedForeignBlob instanceof SerializerBlob).toBe(false);
  const unchangedAppends: unknown[] = [];
  appendToFormData(
    { append: (_key: string, item: unknown) => unchangedAppends.push(item) } as unknown as globalThis.FormData,
    'file',
    unchangedForeignBlob,
    'image/png'
  );
  expect(unchangedAppends).toEqual([unchangedForeignBlob]);
  const unchangedRoundTrip = await readBlobBytes(unchangedAppends[0]);
  expect(Array.from(unchangedRoundTrip)).toEqual(Array.from(unchangedPayload));

  const retypedPayload = new Uint8Array([255, 128, 127, 2, 1, 0]);
  const retypedForeignBlob = new ForeignBlob([retypedPayload], { type: 'application/octet-stream' });
  expect(retypedForeignBlob instanceof SerializerBlob).toBe(false);
  const retypedAppends: unknown[] = [];
  appendToFormData(
    { append: (_key: string, item: unknown) => retypedAppends.push(item) } as unknown as globalThis.FormData,
    'file',
    retypedForeignBlob,
    'image/png'
  );
  expect(retypedAppends).toHaveLength(1);
  expect(retypedAppends[0]).not.toBe(retypedForeignBlob);
  expect(retypedAppends[0] instanceof SerializerBlob).toBe(true);
  expect((retypedAppends[0] as Blob).type).toBe('image/png');
  const retypedRoundTrip = await readBlobBytes(retypedAppends[0]);
  expect(Array.from(retypedRoundTrip)).toEqual(Array.from(retypedPayload));
});

test('explicit multipart content types appear in serialized part headers', async () => {
  const api = await generateEndpoints({
    ...baseOptions,
    filterEndpoints: ['encodedMultipart'],
  });
  const appendToFormData = instantiateAppendToFormData(api);
  const formData = new FormData();
  appendToFormData(formData, 'metadata', { author: 'a' }, 'application/vnd.custom+json');
  appendToFormData(formData, 'label', 'hello', 'text/html; charset=utf-8');
  appendToFormData(formData, 'file', new Blob(['image'], { type: 'application/octet-stream' }), 'image/png');

  const request = new Request('https://example.test/upload', { method: 'POST', body: formData });
  const boundary = request.headers.get('content-type')?.split('boundary=')[1];
  expect(boundary).toBeTruthy();
  const serialized = new TextDecoder().decode(await request.arrayBuffer());
  const parts = serialized.split(`--${boundary}`);
  const metadataPart = parts.find((part) => part.includes('name="metadata"'));
  const labelPart = parts.find((part) => part.includes('name="label"'));
  const filePart = parts.find((part) => part.includes('name="file"'));

  expect(metadataPart).toContain('Content-Type: application/vnd.custom+json');
  expect(metadataPart).toContain('\r\n\r\n{"author":"a"}');
  expect(labelPart).toContain('Content-Type: text/html; charset=utf-8');
  expect(labelPart).toContain('\r\n\r\nhello');
  expect(filePart).toContain('Content-Type: image/png');
  expect(filePart).toContain('\r\n\r\nimage');
});

test('composed and referenced binary schemas resolve to DOM Blob beside a local Blob schema', async () => {
  const api = await generateEndpoints({
    ...baseOptions,
    apiFile: './fixtures/typecheckOnlyApi.ts',
    filterEndpoints: ['uploadComposed'],
  });

  expect(api).toMatch(/export type BinaryPart = globalThis\.Blob/);
  expect(api).toMatch(/blobPart\?: globalThis\.Blob/);
  expect(api).toContain('[key: string]: globalThis.Blob');
  expect(api).toMatch(/export type Blob = \{\s+width: number;/);
  expect(
    compileGeneratedSource(
      `${api}
const payloadAssignment: ComposedUpload["payload"] = new Blob([]);
const nestedAssignment: ComposedUpload["intersected"]["blobPart"] = new Blob([]);
const dictionaryAssignment: NonNullable<ComposedUpload["binaryDictionary"]> = { file: new Blob([]) };
const localBlobAssignment: Blob = { width: 3 };
`
    )
  ).toEqual([]);
});
