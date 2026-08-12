import path from 'node:path';
import prettier from 'prettier';
import type { BuiltInParserName } from 'prettier';

/**
 * The Prettier parser to use for a given file extension, keyed by the
 * extension without its leading dot.
 *
 * @internal
 */
const EXTENSION_TO_PARSER: Record<string, BuiltInParserName> = {
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
};

/**
 * Formats generated code with Prettier.
 *
 * The parser is chosen from {@linkcode filePath}'s extension; when no path
 * is given the content is parsed as TypeScript and no config is resolved
 * unless {@linkcode prettierConfigFile} names one. Config resolution is
 * anchored at the current working directory rather than at
 * {@linkcode filePath}, and `.editorconfig` is only consulted when no
 * explicit config file was supplied.
 *
 * @param filePath - The path the content will be written to, or `null` to format it as TypeScript without resolving a config from a path.
 * @param content - The source code to format.
 * @param [prettierConfigFile] - An explicit Prettier config file to use instead of the default resolution.
 * @returns A {@linkcode Promise | promise} resolving to the formatted source code.
 * @throws An {@linkcode Error} if the content cannot be parsed, or if {@linkcode filePath} has an extension with no matching parser.
 *
 * @since 1.0.0
 * @public
 */
export async function prettify(filePath: string | null, content: string, prettierConfigFile?: string): Promise<string> {
  let config = null;
  let parser = 'typescript';

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
