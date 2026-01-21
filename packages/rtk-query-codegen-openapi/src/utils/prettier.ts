import * as path from 'node:path';
import type { BuiltInParserName } from 'prettier';
import prettier from 'prettier';

const EXTENSION_TO_PARSER = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'babel',
  jsx: 'babel',
  'js.flow': 'flow',
  flow: 'flow',
  gql: 'graphql',
  graphql: 'graphql',
  css: 'scss',
  scss: 'scss',
  less: 'scss',
  stylus: 'scss',
  markdown: 'markdown',
  md: 'markdown',
  json: 'json',
} as const satisfies Record<string, BuiltInParserName> as Record<string, BuiltInParserName>;

export async function prettify(filePath: string | null, content: string, prettierConfigFile?: string): Promise<string> {
  let config: Awaited<ReturnType<typeof prettier.resolveConfig>> = null;
  let parser = 'typescript' satisfies BuiltInParserName as BuiltInParserName;

  if (filePath) {
    const fileExtension = path.extname(filePath).slice(1);
    parser = EXTENSION_TO_PARSER[fileExtension];
    config = await prettier.resolveConfig(process.cwd(), {
      useCache: true,
      editorconfig: !prettierConfigFile,
      config: prettierConfigFile,
    });
  } else if (prettierConfigFile) {
    config = await prettier.resolveConfig(process.cwd(), {
      useCache: true,
      config: prettierConfigFile,
    });
  }

  return prettier.format(content, {
    parser,
    ...config,
  });
}
