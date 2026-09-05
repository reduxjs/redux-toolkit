import type { NodePath } from '@babel/core'
import * as babel from '@babel/core'
import { generate } from '@babel/generator'
import { declare } from '@babel/helper-plugin-utils'
import type {
  CallExpression,
  ExportNamedDeclaration,
  ExportSpecifier,
  Function,
  ImportDeclaration,
  ImportSpecifier,
  MemberExpression,
  Node,
  Statement,
} from '@babel/types'
import * as path from 'node:path'
import type { InlineConfig, Rolldown, UserConfig, UserConfigFn } from 'tsdown'
import { defineConfig } from 'tsdown'
import packageJson from './package.json' with { type: 'json' }
import type {
  BabelPluginResult,
  MangleErrorsPluginOptions,
} from './scripts/mangleErrors.mjs'
import { mangleErrorsPlugin } from './scripts/mangleErrors.mjs'
import type { Id } from './src/tsHelpers.js'

/**
 * @internal
 */
const cwd = import.meta.dirname

/**
 * @internal
 */
const packageJsonPath = path.join(cwd, 'package.json')

/**
 * @internal
 */
const sourceRootDirectory = path.join(cwd, 'src')

/**
 * @internal
 */
const RE_NODE_MODULES = /[\\/]node_modules[\\/]/

/**
 * @internal
 */
const RE_TS = /\.([cm]?)tsx?$/

/**
 * @internal
 */
const RE_DTS = /\.d\.([cm]?)ts$/

/**
 * @internal
 */
type GenerateBundleObjectHook = Id<
  Pick<
    Extract<
      NonNullable<Rolldown.Plugin['generateBundle']>,
      { handler: unknown }
    >,
    'order'
  >
>

/**
 * A {@linkcode Rolldown.Plugin | Rolldown plugin} to emit a CommonJS entry
 * file that switches between development and production bundles based on
 * `NODE_ENV`. Automatically derives the folder and prefix from the output
 * chunk filenames. Only acts on production CJS builds (chunks ending in
 * `.production.min.cjs`).
 *
 * @param [pluginOptions={}] - Options forwarded to the plugin.
 * @returns A {@linkcode Rolldown.Plugin | Rolldown plugin} that emits the CJS entry file.
 * @internal
 */
const writeCommonJSEntryPlugin = (
  pluginOptions: GenerateBundleObjectHook = {},
): Rolldown.Plugin => {
  const { order = null } = pluginOptions

  return {
    name: `${packageJson.name}:write-commonjs-entry`,
    generateBundle: {
      order,
      handler(outputOptions, bundle, isWrite) {
        if (outputOptions.format === 'cjs' && isWrite) {
          Object.values(bundle).forEach((chunk) => {
            if (
              chunk.type === 'chunk' &&
              chunk.isEntry &&
              chunk.fileName.endsWith('.production.min.cjs')
            ) {
              const chunkDirectory = path.dirname(chunk.fileName)

              const prefix = path.basename(
                chunk.fileName,
                '.production.min.cjs',
              )

              this.emitFile({
                code: `"use strict";
if (process.env.NODE_ENV === "production") {
  module.exports = require("./${prefix}.production.min.cjs");
} else {
  module.exports = require("./${prefix}.development.cjs");
}\n`,
                fileName: `${chunkDirectory}/index.js`,
                isEntry: true,
                sourcemapFileName: `${chunkDirectory}/index.js.map`,
                type: 'prebuilt-chunk',
              })
            }
          })
        }
      },
    },
  }
}

/**
 * Extract error strings, replace them with error codes, and write messages to
 * a file.
 *
 * @param [mangleErrorsPluginOptions={}] - Options forwarded to the {@linkcode mangleErrorsPlugin()}. Supported options include {@linkcode MangleErrorsPluginOptions.minify | minify} to indicate whether error messages should be further minified.
 * @returns A {@linkcode Rolldown.Plugin | Rolldown plugin} that applies the Babel transformation to TypeScript/TSX sources matching the configured filter and returns transformed code and source maps.
 * @internal
 */
const mangleErrorsTransform = (
  mangleErrorsPluginOptions: MangleErrorsPluginOptions = {},
): Rolldown.Plugin => {
  const { minify = false } = mangleErrorsPluginOptions

  return {
    name: `${packageJson.name}:mangle-errors`,
    transform: {
      filter: {
        code: {
          include: ['throw'],
        },
        id: {
          exclude: [RE_DTS, RE_NODE_MODULES],
          include: [RE_TS],
        },
        moduleType: {
          include: ['ts', 'tsx'],
        },
      },

      async handler(code, id, meta) {
        try {
          const res = await babel.transformAsync(code, {
            ast: true,
            cwd,
            filename: id,
            filenameRelative: path.relative(sourceRootDirectory, id),
            parserOpts: {
              createParenthesizedExpressions: true,
              errorRecovery: true,
              plugins: [['typescript', { dts: false }], 'jsx'],
              ranges: true,
              sourceFilename: id,
              sourceType: 'module',
            },
            plugins: [
              [
                mangleErrorsPlugin,
                { minify } satisfies MangleErrorsPluginOptions,
              ],
            ],
            sourceFileName: id,
            sourceMaps: 'both',
            sourceType: 'module',
          })

          if (res == null) {
            throw new Error('Babel transformAsync returned null')
          }

          return {
            code: res.code ?? code,
            map: {
              ...res.map,
              mappings: res.map?.mappings ?? '',
              names: [...(res.map?.names ?? [])],
              sources: [...(res.map?.sources ?? [])],
              sourcesContent: [...(res.map?.sourcesContent ?? [])],
              x_google_ignoreList: [...(res.map?.ignoreList ?? [])],
            },
            meta,
            moduleSideEffects: false,
            moduleType: meta.moduleType,
            packageJsonPath,
          }
        } catch (err) {
          console.error('Babel mangleErrors error: ', err)
          return null
        }
      },
    },
  }
}

/**
 * A {@linkcode Rolldown.Plugin | Rolldown plugin} to remove generated CommonJS
 * (`.cjs`) JavaScript outputs from DTS-only builds. When generating type
 * definition builds we may still emit stray `.cjs` files; this plugin deletes
 * those entries from the generated bundle to ensure only declaration artifacts
 * remain.
 *
 * @param [pluginOptions={}] - Options forwarded to the plugin.
 * @returns A {@linkcode Rolldown.Plugin | Rolldown plugin} that prunes `.cjs` files from the bundle.
 * @internal
 */
const removeCJSOutputsFromDTSBuilds = (
  pluginOptions: GenerateBundleObjectHook = {},
): Rolldown.Plugin => {
  const { order = null } = pluginOptions

  return {
    name: `${packageJson.name}:remove-cjs-outputs-from-dts-builds`,
    generateBundle: {
      order,
      handler(outputOptions, bundle, isWrite): void {
        if (outputOptions.format === 'cjs' && isWrite) {
          Object.values(bundle).forEach((outputChunk) => {
            if (
              outputChunk.type === 'chunk' &&
              outputChunk.isEntry &&
              !RE_DTS.test(outputChunk.fileName)
            ) {
              delete bundle[outputChunk.fileName]
              delete bundle[`${outputChunk.fileName}.map`]
            }
          })
        }
      },
    },
  }
}

/**
 * A {@linkcode Rolldown.Plugin | Rolldown plugin} that removes the optional
 * {@linkcode Rolldown.SourceMap.file | file} field from every emitted source
 * map.
 *
 * {@linkcode https://esbuild.github.io/ | esbuild} (and so the previous
 * {@linkcode https://tsup.egoist.dev/ | tsup} build) omitted this field;
 * {@link https://rolldown.rs/ | Rolldown} emits it. While it is present,
 * {@link https://nextjs.org/docs/app/api-reference/turbopack | Turbopack}
 * chains through our source maps and attributes the bundle to our original
 * `src/*.ts` files rather than to the published artifact - and it does so for
 * the other Redux packages sharing the bundle, not only for ours.
 *
 * `examples/publish-ci/*` records which of our several published builds each
 * bundler actually resolves, and that signal only survives while the artifact
 * stays visible in the consuming bundler's output. The field is optional per
 * the source map spec and every other field
 * ({@linkcode Rolldown.SourceMap.sources | sources},
 * {@linkcode Rolldown.SourceMap.sourcesContent | sourcesContent},
 * {@linkcode Rolldown.SourceMap.mappings | mappings},
 * {@linkcode Rolldown.SourceMap.names | names}) is left untouched, so stepping
 * into RTK still resolves to the original TypeScript.
 *
 * Wired into both the JavaScript and the declaration builds, so the
 * `.d.ts.map` / `.d.mts.map` files lose the field as well and the published
 * `dist/` carries no source map with it.
 *
 * @param [pluginOptions={}] - Options forwarded to the plugin.
 * @returns A {@linkcode Rolldown.Plugin | Rolldown plugin} that strips {@linkcode Rolldown.SourceMap.file | file} from every emitted source map.
 * @internal
 */
const stripSourcemapFileField = (
  pluginOptions: GenerateBundleObjectHook = {},
): Rolldown.Plugin => {
  const { order = null } = pluginOptions

  return {
    name: `${packageJson.name}:strip-sourcemap-file-field`,
    generateBundle: {
      order,
      handler(_outputOptions, bundle): void {
        Object.values(bundle).forEach((outputAsset) => {
          if (
            outputAsset.type !== 'asset' ||
            !outputAsset.fileName.endsWith('.map') ||
            typeof outputAsset.source !== 'string'
          ) {
            return
          }

          const sourcemap: Partial<Rolldown.SourceMap> = JSON.parse(
            outputAsset.source,
          )

          if (!('file' in sourcemap)) {
            return
          }

          delete sourcemap.file

          outputAsset.source = JSON.stringify(sourcemap)
        })
      },
    },
  }
}

/**
 * @internal
 */
const isPureAnnotated = (node: Node): boolean => {
  const { leadingComments } = node

  if (!leadingComments || leadingComments.length === 0) {
    return false
  }

  return leadingComments.some((leadingComment) =>
    /[@#]__PURE__/.test(leadingComment.value),
  )
}

/**
 * @internal
 */
const annotateAsPure = (nodePath: NodePath): void => {
  if (isPureAnnotated(nodePath.node)) {
    return
  }

  nodePath.addComment('leading', ' @__PURE__ ', false)
}

/**
 * @internal
 */
type AnnotateAsPurePluginOptions = Id<
  GenerateBundleObjectHook & {
    /**
     * A list of call expression method names to annotate as pure.
     *
     * @default []
     */
    callExpressions?: string[] | undefined
  }
>

/**
 * @internal
 */
type AnnotateAsPurePluginResult = BabelPluginResult<
  AnnotateAsPurePluginOptions,
  'annotate-as-pure'
>

/**
 * @internal
 */
const hasCallableParent = <NodePathType extends NodePath>(
  nodePath: NodePathType,
): nodePath is NodePathType & { parentPath: NodePath<CallExpression> } =>
  nodePath.parentPath != null &&
  (nodePath.parentPath.isCallExpression() ||
    nodePath.parentPath.isNewExpression())

/**
 * @internal
 */
const isUsedAsCallee = <
  NodePathType extends NodePath<CallExpression | Function>,
>(
  nodePath: NodePathType,
): nodePath is NodePathType & { parentPath: NodePath<CallExpression> } =>
  hasCallableParent(nodePath) && nodePath.parentPath.get('callee') === nodePath

/**
 * @internal
 */
function isInCallee(nodePath: NodePath<CallExpression>): boolean {
  do {
    nodePath = nodePath.parentPath as NodePath<CallExpression>

    if (isUsedAsCallee(nodePath)) {
      return true
    }
  } while (!nodePath.isStatement() && !nodePath.isFunction())

  return false
}

/**
 * @internal
 */
const isExecutedDuringInitialization = (
  nodePath: NodePath<CallExpression>,
): boolean => {
  let functionParent: NodePath<Function> | null = nodePath.getFunctionParent()

  while (functionParent) {
    if (!isUsedAsCallee(functionParent)) {
      return false
    }

    functionParent = functionParent.getFunctionParent()
  }

  return true
}

/**
 * @internal
 */
const isInAssignmentContext = (nodePath: NodePath<CallExpression>): boolean => {
  const statement: NodePath<Statement> | null = nodePath.getStatementParent()

  let parentPath: NodePath | null = null

  do {
    ;({ parentPath } = parentPath || nodePath)

    if (
      parentPath != null &&
      (parentPath.isVariableDeclaration() ||
        parentPath.isAssignmentExpression() ||
        parentPath.isClass())
    ) {
      return true
    }
  } while (parentPath !== statement)

  return false
}

/**
 * @internal
 */
function callableExpressionVisitor(nodePath: NodePath<CallExpression>): void {
  if (
    isUsedAsCallee(nodePath) ||
    isInCallee(nodePath) ||
    !isExecutedDuringInitialization(nodePath) ||
    (!isInAssignmentContext(nodePath) &&
      !nodePath.getStatementParent()?.isExportDefaultDeclaration())
  ) {
    return
  }

  annotateAsPure(nodePath)
}

/**
 * @internal
 */
const annotateAsPureBabelPlugin = declare(
  (
    api,
    options: AnnotateAsPurePluginOptions = {},
  ): AnnotateAsPurePluginResult => {
    const { types: t } = api

    const { callExpressions = [] } = options

    return {
      name: 'annotate-as-pure',
      visitor: {
        CallExpression(path: NodePath<CallExpression>) {
          if (callExpressions.length === 0) {
            return
          }

          const callee = path.get('callee')

          if (!callee.isIdentifier()) {
            return
          }

          if (
            callExpressions.some((callExpression) =>
              callee.matchesPattern(callExpression),
            ) ||
            callExpressions.includes(callee.node.name)
          ) {
            callableExpressionVisitor(path)
          }
        },

        MemberExpression(path: NodePath<MemberExpression>) {
          if (callExpressions.length === 0) {
            return
          }

          const property = path.get('property')

          if (!property.isIdentifier()) {
            return
          }

          if (
            callExpressions.some((callExpression) => {
              if (path.matchesPattern(callExpression)) {
                return true
              }

              return false
            })
          ) {
            const statementParent = path.getStatementParent()

            if (statementParent == null) {
              return
            }

            if (
              statementParent.isReturnStatement() ||
              t.isVariableDeclaration(statementParent.node, {
                kind: 'const',
              }) ||
              (t.isExportNamedDeclaration(statementParent.node, {
                exportKind: 'value',
              }) &&
                t.isVariableDeclaration(statementParent.node.declaration, {
                  kind: 'const',
                }))
            ) {
              annotateAsPure(path)
            }
          }
        },
      },
    }
  },
)

/**
 * @internal
 */
const annotateAsPurePlugin = (
  annotateAsPurePluginOptions: AnnotateAsPurePluginOptions = {},
): Rolldown.Plugin => {
  const { callExpressions = [], order = null } = annotateAsPurePluginOptions

  return {
    name: `${packageJson.name}:annotate-as-pure`,
    transform: {
      filter: {
        id: {
          exclude: [RE_DTS, RE_NODE_MODULES],
          include: [RE_TS],
        },
        moduleType: {
          include: ['ts', 'tsx'],
        },
      },
      order,
      async handler(code, id, meta) {
        const transformResult = await babel.transformAsync(code, {
          ast: true,
          cwd,
          filename: id,
          filenameRelative: path.relative(sourceRootDirectory, id),
          parserOpts: {
            createParenthesizedExpressions: true,
            errorRecovery: true,
            plugins: [['typescript', { dts: false }], 'jsx'],
            ranges: true,
            sourceFilename: id,
            sourceType: 'module',
          },
          plugins: [
            [
              annotateAsPureBabelPlugin,
              {
                callExpressions,
              } as const satisfies Required<
                Pick<AnnotateAsPurePluginOptions, 'callExpressions'>
              >,
            ],
          ],
          sourceFileName: id,
          sourceMaps: 'both',
          sourceType: 'module',
        })

        if (transformResult == null) {
          return null
        }

        return {
          code: transformResult.code ?? code,
          map: {
            ...transformResult.map,
            mappings: transformResult.map?.mappings ?? '',
            names: [...(transformResult.map?.names ?? [])],
            sources: [...(transformResult.map?.sources ?? [])],
            sourcesContent: [...(transformResult.map?.sourcesContent ?? [])],
            x_google_ignoreList: [...(transformResult.map?.ignoreList ?? [])],
          },
          meta,
          moduleSideEffects: false,
          moduleType: meta.moduleType,
          packageJsonPath,
        }
      },
    },
  }
}

/**
 * A {@linkcode Rolldown.Plugin | Rolldown plugin} to implement proper
 * `import type` / `export type` syntax in TypeScript declaration files.
 *
 * In a `.d.ts` file, any import whose local name is not re-exported as a plain
 * value is type-only. This plugin:
 * 1. Splits mixed `import { Value, type Type }` into separate value/type imports.
 * 2. Splits mixed `export { value, type Type }` into separate value/type exports.
 *
 * @param [pluginOptions={}] - Options forwarded to the plugin.
 * @returns A {@linkcode Rolldown.Plugin | Rolldown plugin} that rewrites imports and exports in `.d.ts` files.
 * @internal
 */
const splitTypeImports = (
  pluginOptions: GenerateBundleObjectHook = {},
): Rolldown.Plugin => {
  const { types: t } = babel

  const { order = null } = pluginOptions

  return {
    name: `${packageJson.name}:split-type-imports`,
    renderChunk: {
      order,
      async handler(code, chunk) {
        if (!(RE_DTS.test(chunk.fileName) && chunk.isEntry)) {
          return
        }

        const parsedFile = await babel.parseAsync(code, {
          ast: true,
          cwd,
          filename: chunk.fileName,
          filenameRelative: path.relative(sourceRootDirectory, chunk.fileName),
          parserOpts: {
            createParenthesizedExpressions: true,
            errorRecovery: true,
            plugins: [['typescript', { dts: true }]],
            ranges: true,
            sourceFilename: chunk.fileName,
            sourceType: 'module',
          },
          sourceFileName: chunk.fileName,
          sourceMaps: 'both',
          sourceType: 'module',
        })

        if (parsedFile == null) {
          return null
        }

        /**
         * Collect local names that are explicitly exported as values (no
         * `type` keyword). In a `.d.ts` file any import whose local name is
         * NOT in this set is type-only.
         */
        const valueExportedNames = new Set<string>()

        parsedFile.program.body.forEach((statement) => {
          if (t.isExportNamedDeclaration(statement)) {
            statement.specifiers.forEach((exportSpecifier) => {
              if (
                t.isExportSpecifier(exportSpecifier) &&
                exportSpecifier.exportKind === 'value' &&
                t.isIdentifier(exportSpecifier.local)
              ) {
                valueExportedNames.add(exportSpecifier.local.name)
              }
            })
          }
        })

        // Preserve value imports for identifiers used as base classes in
        // extends clauses. `import type { X }` cannot be used in
        // `class Y extends X {}`.
        parsedFile.program.body.forEach((statement) => {
          const exportedDeclaration = t.isExportNamedDeclaration(statement)
            ? statement.declaration
            : statement

          if (
            t.isClassDeclaration(exportedDeclaration) &&
            exportedDeclaration.superClass != null &&
            t.isIdentifier(exportedDeclaration.superClass)
          ) {
            valueExportedNames.add(exportedDeclaration.superClass.name)
          }
        })

        // Split value/type import specifiers into separate import declarations.
        parsedFile.program.body = parsedFile.program.body.flatMap(
          (statement) => {
            if (t.isImportDeclaration(statement)) {
              // Namespace imports (`import * as X`) can't be split - convert
              // the whole declaration to `import type * as X` when X is not a
              // value export.
              if (
                statement.importKind === 'value' &&
                statement.specifiers.length === 1 &&
                t.isImportNamespaceSpecifier(statement.specifiers[0]) &&
                !valueExportedNames.has(statement.specifiers[0].local.name)
              ) {
                return [
                  {
                    ...statement,
                    importKind: 'type',
                  } satisfies ImportDeclaration,
                ]
              }

              const newImportSpecifiers = statement.specifiers.map(
                (importSpecifier) => {
                  if (
                    t.isImportSpecifier(importSpecifier, {
                      importKind: 'value',
                    }) &&
                    t.isIdentifier(importSpecifier.imported) &&
                    !valueExportedNames.has(importSpecifier.local.name)
                  ) {
                    const newTypeImportSpecifier = {
                      ...t.importSpecifier(
                        t.identifier(importSpecifier.local.name),
                        t.identifier(importSpecifier.imported.name),
                      ),
                      importKind: 'type',
                    } satisfies ImportSpecifier

                    return newTypeImportSpecifier
                  }

                  return importSpecifier
                },
              )

              const valueImportSpecifiers = newImportSpecifiers.filter(
                (importSpecifier) =>
                  t.isImportSpecifier(importSpecifier, { importKind: 'value' }),
              )

              const typeImportSpecifiers = newImportSpecifiers.filter(
                (importSpecifier) =>
                  t.isImportSpecifier(importSpecifier, { importKind: 'type' }),
              )

              const statementsList: Statement[] = []

              if (valueImportSpecifiers.length > 0) {
                statementsList.push({
                  ...t.importDeclaration(
                    valueImportSpecifiers,
                    statement.source,
                  ),
                  importKind: 'value',
                } satisfies ImportDeclaration)
              }

              if (typeImportSpecifiers.length > 0) {
                statementsList.push({
                  ...t.importDeclaration(
                    typeImportSpecifiers.map(
                      (typeImportSpecifier) =>
                        ({
                          ...t.importSpecifier(
                            typeImportSpecifier.local,
                            typeImportSpecifier.imported,
                          ),
                          importKind: 'value',
                        }) satisfies ImportSpecifier,
                    ),
                    statement.source,
                  ),
                  importKind: 'type',
                } satisfies ImportDeclaration)
              }

              return statementsList.length === 0 ? [statement] : statementsList
            }

            return [statement]
          },
        )

        // Split mixed `export { value, type Type }` into separate statements.
        parsedFile.program.body = parsedFile.program.body.flatMap(
          (statement) => {
            if (
              t.isExportNamedDeclaration(statement) &&
              statement.declaration == null
            ) {
              const valueExportSpecifiers = statement.specifiers.filter(
                (exportSpecifier) =>
                  t.isExportSpecifier(exportSpecifier, { exportKind: 'value' }),
              )

              const typeExportSpecifiers = statement.specifiers.filter(
                (exportSpecifier) =>
                  t.isExportSpecifier(exportSpecifier, { exportKind: 'type' }),
              )

              if (
                valueExportSpecifiers.length > 0 &&
                typeExportSpecifiers.length > 0
              ) {
                return [
                  {
                    ...t.exportNamedDeclaration(
                      null,
                      valueExportSpecifiers,
                      statement.source,
                    ),
                    exportKind: 'value',
                  } satisfies ExportNamedDeclaration,
                  {
                    ...t.exportNamedDeclaration(
                      null,
                      typeExportSpecifiers.map(
                        (typeExportSpecifier) =>
                          ({
                            ...t.exportSpecifier(
                              typeExportSpecifier.local,
                              typeExportSpecifier.exported,
                            ),
                            exportKind: 'value',
                          }) satisfies ExportSpecifier,
                      ),
                      statement.source,
                    ),
                    exportKind: 'type',
                  } satisfies ExportNamedDeclaration,
                ]
              }
            }

            return [statement]
          },
        )

        const generatedResults = generate(
          parsedFile,
          {
            comments: true,
            sourceFileName: chunk.fileName,
            sourceMaps: true,
          },
          code,
        )

        return {
          code: generatedResults.code,
          map: {
            ...generatedResults.map,
            mappings: generatedResults.map?.mappings ?? '',
            names: [...(generatedResults.map?.names ?? [])],
            sources: [...(generatedResults.map?.sources ?? [])],
            sourcesContent: [...(generatedResults.map?.sourcesContent ?? [])],
            x_google_ignoreList: [...(generatedResults.map?.ignoreList ?? [])],
          },
        }
      },
    },
  }
}

/**
 * @internal
 */
const peerAndProductionDependencies = Object.keys({
  ...packageJson.dependencies,
  ...packageJson.peerDependencies,
} as const) satisfies Extract<Rolldown.ExternalOption, unknown[]>

/**
 * @internal
 */
const neverBundle = [
  ...peerAndProductionDependencies,
  /uncheckedindexed/,
] as const satisfies Extract<Rolldown.ExternalOption, unknown[]>

const tsdownConfig: UserConfigFn = defineConfig((cliOptions) => {
  const commonOptions = {
    clean: false,
    cjsDefault: false,
    cwd,
    deps: {
      neverBundle,
      onlyBundle: [],
    },
    devtools: {
      clean: true,
      enabled: true,
    },
    dts: false,
    entry: {
      'redux-toolkit': 'src/index.ts',
    },
    failOnWarn: true,
    fixedExtension: false,
    format: ['esm'],
    hash: false,
    inputOptions: (options) => {
      const plugins = options.plugins
        ? Array.isArray(options.plugins)
          ? options.plugins.flat()
          : [options.plugins]
        : []

      return {
        ...options,
        experimental: {
          ...options.experimental,
          lazyBarrel: true,
          nativeMagicString: true,
        },
        plugins: [
          ...plugins,
          mangleErrorsTransform(),
          annotateAsPurePlugin({
            callExpressions: ['__assign', 'Object.assign'],
          }),
        ],
        transform: {
          ...options.transform,
          inject: {
            ...options.transform?.inject,
            'Object.assign': [
              path.join(sourceRootDirectory, 'bundle-size-utils.ts'),
              '__assign',
            ],
            React: ['react', '*'],
          },
          typescript: {
            ...options.transform?.typescript,
            optimizeConstEnums: true,
            optimizeEnums: true,
          },
        },
      } as const satisfies Rolldown.InputOptions
    },
    minify: false,
    name: packageJson.name,
    nodeProtocol: true,
    outDir: 'dist',
    outExtensions: ({ format, options }) => ({
      dts: format === 'es' ? '.d.mts' : '.d.ts',
      js:
        format === 'es' && options.transform?.target != null
          ? (Array.isArray(options.transform?.target) &&
              options.transform?.target.includes('es2017')) ||
            options.transform?.target === 'es2017'
            ? '.legacy-esm.js'
            : `${options.platform === 'browser' ? '.browser' : '.modern'}.mjs`
          : '.cjs',
    }),
    outputOptions: (options, format, context) => {
      const plugins = options.plugins
        ? Array.isArray(options.plugins)
          ? options.plugins.flat()
          : [options.plugins]
        : []

      const outputPlugins = [...plugins, stripSourcemapFileField()]

      return {
        ...options,
        codeSplitting: false,
        comments: {
          annotation: true,
          jsdoc: false,
          legal: true,
        },
        plugins: outputPlugins,
        ...(format === 'cjs' && !context.cjsDts
          ? {
              externalLiveBindings: false,
              plugins: [
                ...outputPlugins,
                ...(typeof options.entryFileNames === 'string' &&
                options.entryFileNames?.endsWith('.production.min.cjs')
                  ? [writeCommonJSEntryPlugin()]
                  : []),
              ],
            }
          : {}),
        strict: true,
      } as const satisfies Rolldown.OutputOptions
    },
    platform: 'node',
    root: sourceRootDirectory,
    shims: true,
    sourcemap: true,
    target: ['esnext'],
    treeshake: {
      moduleSideEffects: false,
    },
    tsconfig: path.join(cwd, 'tsconfig.build.json'),
    ...cliOptions,
  } as const satisfies InlineConfig

  const sharedDTSConfig = {
    ...commonOptions,
    deps: {
      ...commonOptions.deps,
      neverBundle,
    },
    dts: {
      build: false,
      cjsDefault: false,
      cwd: commonOptions.cwd,
      dtsInput: false,
      eager: false,
      emitDtsOnly: true,
      emitJs: false,
      enabled: true,
      generator: 'tsc',
      incremental: false,
      logger: console,
      newContext: false,
      oxc: {},
      parallel: false,
      resolver: 'tsc',
      sideEffects: false,
      sourcemap: true,
      tsconfig: commonOptions.tsconfig,
      tsgo: {},
      vue: false,
    },
    format: ['cjs', 'esm'],
    inputOptions: (options) => {
      const plugins = options.plugins
        ? Array.isArray(options.plugins)
          ? options.plugins.flat()
          : [options.plugins]
        : []

      return {
        ...options,
        experimental: {
          ...options.experimental,
          attachDebugInfo: 'none',
          lazyBarrel: true,
          nativeMagicString: true,
        },
        plugins: [...plugins, splitTypeImports()],
        transform: {
          ...options.transform,
          typescript: {
            ...options.transform?.typescript,
            optimizeConstEnums: true,
            optimizeEnums: true,
          },
        },
      } as const satisfies Rolldown.InputOptions
    },
    outputOptions: (options, format, context) => {
      const plugins = options.plugins
        ? Array.isArray(options.plugins)
          ? options.plugins.flat()
          : [options.plugins]
        : []

      return {
        ...options,
        codeSplitting: false,
        comments: {
          annotation: true,
          jsdoc: true,
          legal: true,
        },
        plugins: [
          ...plugins,
          stripSourcemapFileField(),
          format === 'cjs' && !context.cjsDts
            ? removeCJSOutputsFromDTSBuilds()
            : false,
        ],
        strict: true,
      } as const satisfies Rolldown.OutputOptions
    },
  } as const satisfies InlineConfig

  const modernEsmConfig = {
    ...commonOptions,
  } as const satisfies InlineConfig

  const developmentCjsConfig = {
    ...commonOptions,
    define: {
      process: JSON.stringify('process'),
    },
    env: {
      NODE_ENV: 'development',
    },
    format: ['cjs'],
    outExtensions: () => ({ js: '.development.cjs' }),
  } as const satisfies InlineConfig

  const productionCjsConfig = {
    ...commonOptions,
    define: developmentCjsConfig.define,
    env: {
      NODE_ENV: 'production',
    },
    format: ['cjs'],
    minify: true,
    outExtensions: () => ({ js: '.production.min.cjs' }),
  } as const satisfies InlineConfig

  const browserEsmConfig = {
    ...commonOptions,
    define: {
      process: 'undefined',
      window: JSON.stringify('window'),
    },
    env: productionCjsConfig.env,
    minify: productionCjsConfig.minify,
    platform: 'browser',
  } as const satisfies InlineConfig

  const legacyEsmConfig = {
    ...commonOptions,
    target: ['es2017'],
  } as const satisfies InlineConfig

  return [
    {
      ...modernEsmConfig,
      name: 'Redux-Toolkit-Core-ESM',
      copy: ({ outDir }) => [
        {
          from: path.join(sourceRootDirectory, 'uncheckedindexed.ts'),
          to: outDir,
          verbose: true,
        },
      ],
      entry: {
        'redux-toolkit': 'src/index.ts',
      },
    },
    {
      ...modernEsmConfig,
      name: 'RTK-React-ESM',
      deps: {
        ...modernEsmConfig.deps,
        neverBundle: [
          ...peerAndProductionDependencies,
          packageJson.name,
          `${packageJson.name}/react`,
          `${packageJson.name}/query`,
        ],
      },
      entry: {
        'react/redux-toolkit-react': 'src/react/index.ts',
      },
    },
    {
      ...modernEsmConfig,
      name: 'RTK-Query-ESM',
      deps: {
        ...modernEsmConfig.deps,
        neverBundle: [
          ...peerAndProductionDependencies,
          packageJson.name,
          `${packageJson.name}/react`,
          `${packageJson.name}/query`,
        ],
      },
      entry: {
        'query/rtk-query': 'src/query/index.ts',
      },
    },
    {
      ...modernEsmConfig,
      name: 'RTK-Query-React-ESM',
      deps: {
        ...modernEsmConfig.deps,
        neverBundle: [
          ...peerAndProductionDependencies,
          packageJson.name,
          `${packageJson.name}/react`,
          `${packageJson.name}/query`,
        ],
      },
      entry: {
        'query/react/rtk-query-react': 'src/query/react/index.ts',
      },
    },

    {
      ...developmentCjsConfig,
      name: 'Redux-Toolkit-Core-CJS-Development',
      entry: {
        'cjs/redux-toolkit': 'src/index.ts',
      },
    },
    {
      ...developmentCjsConfig,
      name: 'RTK-React-CJS-Development',
      deps: {
        ...developmentCjsConfig.deps,
        neverBundle: [
          ...peerAndProductionDependencies,
          packageJson.name,
          `${packageJson.name}/react`,
          `${packageJson.name}/query`,
        ],
      },
      entry: {
        'react/cjs/redux-toolkit-react': 'src/react/index.ts',
      },
    },
    {
      ...developmentCjsConfig,
      name: 'RTK-Query-CJS-Development',
      deps: {
        ...developmentCjsConfig.deps,
        neverBundle: [
          ...peerAndProductionDependencies,
          packageJson.name,
          `${packageJson.name}/react`,
          `${packageJson.name}/query`,
        ],
      },
      entry: {
        'query/cjs/rtk-query': 'src/query/index.ts',
      },
    },
    {
      ...developmentCjsConfig,
      name: 'RTK-Query-React-CJS-Development',
      deps: {
        ...developmentCjsConfig.deps,
        neverBundle: [
          ...peerAndProductionDependencies,
          packageJson.name,
          `${packageJson.name}/react`,
          `${packageJson.name}/query`,
        ],
      },
      entry: {
        'query/react/cjs/rtk-query-react': 'src/query/react/index.ts',
      },
    },
    {
      ...productionCjsConfig,
      name: 'RTK-Core-CJS-Production',
      entry: {
        'cjs/redux-toolkit': 'src/index.ts',
      },
    },

    {
      ...productionCjsConfig,
      name: 'RTK-React-CJS-Production',
      deps: {
        ...productionCjsConfig.deps,
        neverBundle: [
          ...peerAndProductionDependencies,
          packageJson.name,
          `${packageJson.name}/react`,
          `${packageJson.name}/query`,
        ],
      },
      entry: {
        'react/cjs/redux-toolkit-react': 'src/react/index.ts',
      },
    },
    {
      ...productionCjsConfig,
      name: 'RTK-Query-CJS-Production',
      deps: {
        ...productionCjsConfig.deps,
        neverBundle: [
          ...peerAndProductionDependencies,
          packageJson.name,
          `${packageJson.name}/react`,
          `${packageJson.name}/query`,
        ],
      },
      entry: {
        'query/cjs/rtk-query': 'src/query/index.ts',
      },
    },
    {
      ...productionCjsConfig,
      name: 'RTK-Query-React-CJS-Production',
      deps: {
        ...productionCjsConfig.deps,
        neverBundle: [
          ...peerAndProductionDependencies,
          packageJson.name,
          `${packageJson.name}/react`,
          `${packageJson.name}/query`,
        ],
      },
      entry: {
        'query/react/cjs/rtk-query-react': 'src/query/react/index.ts',
      },
    },

    {
      ...browserEsmConfig,
      name: 'Redux-Toolkit-Core-Browser',
      entry: {
        'redux-toolkit': 'src/index.ts',
      },
    },

    {
      ...browserEsmConfig,
      name: 'RTK-React-Browser',
      deps: {
        ...browserEsmConfig.deps,
        neverBundle: [
          ...peerAndProductionDependencies,
          packageJson.name,
          `${packageJson.name}/react`,
          `${packageJson.name}/query`,
        ],
      },
      entry: {
        'react/redux-toolkit-react': 'src/react/index.ts',
      },
    },
    {
      ...browserEsmConfig,
      name: 'RTK-Query-Browser',
      deps: {
        ...browserEsmConfig.deps,
        neverBundle: [
          ...peerAndProductionDependencies,
          packageJson.name,
          `${packageJson.name}/react`,
          `${packageJson.name}/query`,
        ],
      },
      entry: {
        'query/rtk-query': 'src/query/index.ts',
      },
    },
    {
      ...browserEsmConfig,
      name: 'RTK-Query-React-Browser',
      deps: {
        ...browserEsmConfig.deps,
        neverBundle: [
          ...peerAndProductionDependencies,
          packageJson.name,
          `${packageJson.name}/react`,
          `${packageJson.name}/query`,
        ],
      },
      entry: {
        'query/react/rtk-query-react': 'src/query/react/index.ts',
      },
    },
    {
      ...legacyEsmConfig,
      name: 'Redux-Toolkit-Core-Legacy-ESM',
      entry: {
        'redux-toolkit': 'src/index.ts',
      },
    },
    {
      ...legacyEsmConfig,
      name: 'RTK-React-Legacy-ESM',
      deps: {
        ...legacyEsmConfig.deps,
        neverBundle: [
          ...peerAndProductionDependencies,
          packageJson.name,
          `${packageJson.name}/react`,
          `${packageJson.name}/query`,
        ],
      },
      entry: {
        'react/redux-toolkit-react': 'src/react/index.ts',
      },
    },
    {
      ...legacyEsmConfig,
      name: 'RTK-Query-Legacy-ESM',
      deps: {
        ...legacyEsmConfig.deps,
        neverBundle: [
          ...peerAndProductionDependencies,
          packageJson.name,
          `${packageJson.name}/react`,
          `${packageJson.name}/query`,
        ],
      },
      entry: {
        'query/rtk-query': 'src/query/index.ts',
      },
    },
    {
      ...legacyEsmConfig,
      name: 'RTK-Query-React-Legacy-ESM',
      deps: {
        ...legacyEsmConfig.deps,
        neverBundle: [
          ...peerAndProductionDependencies,
          packageJson.name,
          `${packageJson.name}/react`,
          `${packageJson.name}/query`,
        ],
      },
      entry: {
        'query/react/rtk-query-react': 'src/query/react/index.ts',
      },
    },

    {
      ...sharedDTSConfig,
      name: 'Redux-Toolkit-Type-Definitions',
      entry: {
        index: 'src/index.ts',
      },
    },

    {
      ...sharedDTSConfig,
      name: 'RTK-React-Type-Definitions',
      deps: {
        ...sharedDTSConfig.deps,
        neverBundle: [
          ...sharedDTSConfig.deps.neverBundle,
          packageJson.name,
          `${packageJson.name}/react`,
          `${packageJson.name}/query`,
        ],
      },
      entry: {
        'react/index': 'src/react/index.ts',
      },
    },

    {
      ...sharedDTSConfig,
      name: 'RTK-Query-Type-Definitions',
      deps: {
        ...sharedDTSConfig.deps,
        neverBundle: [
          ...sharedDTSConfig.deps.neverBundle,
          packageJson.name,
          `${packageJson.name}/react`,
          `${packageJson.name}/query`,
        ],
      },
      entry: {
        'query/index': 'src/query/index.ts',
      },
    },

    {
      ...sharedDTSConfig,
      name: 'RTK-Query-React-Type-Definitions',
      deps: {
        ...sharedDTSConfig.deps,
        neverBundle: [
          ...sharedDTSConfig.deps.neverBundle,
          packageJson.name,
          `${packageJson.name}/react`,
          `${packageJson.name}/query`,
        ],
      },
      entry: {
        'query/react/index': 'src/query/react/index.ts',
      },
    },
  ] as const satisfies UserConfig[]
})

export default tsdownConfig
