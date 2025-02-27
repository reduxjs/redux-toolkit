import type * as Babel from '@babel/core'
import type { Node, PluginObj, PluginPass } from '@babel/core'
import * as helperModuleImports from '@babel/helper-module-imports'
import * as fs from 'node:fs'
import * as path from 'node:path'

type Babel = typeof Babel

/**
 * Represents the options for the {@linkcode mangleErrorsPlugin}.
 *
 * @internal
 */
export interface MangleErrorsPluginOptions {
  /**
   * Whether to minify the error messages or not.
   * If `true`, the error messages will be replaced with an index
   * that maps object lookup.
   */
  minify: boolean
}

/**
 * Converts an AST type into a JavaScript string so that it can be added to
 * the error message lookup.
 *
 * Adapted from React
 * {@linkcode https://github.com/facebook/react/blob/master/scripts/shared/evalToString.js | evalToString}
 * with some adjustments.
 */
const evalToString = (
  ast: Node | { type: 'Literal'; value: string },
): string => {
  switch (ast.type) {
    case 'StringLiteral':
    case 'Literal': // ESLint
      return ast.value
    case 'BinaryExpression': // `+`
      if (ast.operator !== '+') {
        throw new Error('Unsupported binary operator ' + ast.operator)
      }
      return evalToString(ast.left) + evalToString(ast.right)
    case 'TemplateLiteral':
      return ast.quasis.reduce(
        (concatenatedValue, templateElement) =>
          concatenatedValue + templateElement.value.raw,
        '',
      )
    case 'Identifier':
      return ast.name
    default:
      console.log('Bad AST in mangleErrors -> evalToString(): ', ast)
      throw new Error(`Unsupported AST in evalToString: ${ast.type}, ${ast}`)
  }
}

/**
 * Transforms a `throw new Error` statement based on the
 * {@linkcode MangleErrorsPluginOptions.minify | minify} argument,
 * resulting in a smaller bundle size for consumers in production.
 *
 * If {@linkcode MangleErrorsPluginOptions.minify | minify} is enabled,
 * the error message will be replaced with an index that maps to
 * an object lookup.
 *
 * If {@linkcode MangleErrorsPluginOptions.minify | minify} is disabled,
 * a conditional statement will be added to check `process.env.NODE_ENV`,
 * which will output an error number index in production or the actual
 * error message in development. This allows consumers using Webpack or
 * another build tool to have these messages in development but only the
 * error index in production.
 *
 * @example
 * <caption>__Before:__</caption>
 *
 * ```ts
 * throw new Error('each middleware provided to configureStore must be a function');
 * throw new Error(
 *   '`reducer` is a required argument, and must be a function or an object of functions that can be passed to combineReducers',
 * )
 * ```
 *
 * @example
 * <caption>__After (with minify):__</caption>
 *
 * ```ts
 * throw new Error(formatProdErrorMessage(0));
 * throw new Error(formatProdErrorMessage(1));
 * ```
 *
 * @example
 * <caption>__After (without minify):__</caption>
 *
 * ```ts
 * throw new Error(
 *   process.env.NODE_ENV === 'production'
 *     ? formatProdErrorMessage(4)
 *     : 'each middleware provided to configureStore must be a function',
 * )
 * ```
 */
export const mangleErrorsPlugin = (
  babel: Babel,
  options: MangleErrorsPluginOptions,
): PluginObj<PluginPass & MangleErrorsPluginOptions> => {
  const t = babel.types
  // When the plugin starts up, we'll load in the existing file. This allows us to continually add to it so that the
  // indexes do not change between builds.
  let errorsFiles = ''
  // Save this to the root
  const errorsPath = path.join(__dirname, '../../../errors.json')
  if (fs.existsSync(errorsPath)) {
    errorsFiles = fs.readFileSync(errorsPath).toString()
  }
  const errors = Object.values(JSON.parse(errorsFiles || '{}'))
  // This variable allows us to skip writing back to the file if the errors array hasn't changed
  let changeInArray = false

  return {
    name: 'mangle-errors-plugin',
    pre: () => {
      changeInArray = false
    },
    visitor: {
      ThrowStatement(path) {
        if (
          !('arguments' in path.node.argument) ||
          !t.isNewExpression(path.node.argument)
        ) {
          return
        }
        const args = path.node.argument.arguments
        const { minify } = options

        if (args && args[0]) {
          // Skip running this logic when certain types come up:
          //  Identifier comes up when a variable is thrown (E.g. throw new error(message))
          //  NumericLiteral, CallExpression, and ConditionalExpression is code we have already processed
          if (
            path.node.argument.arguments[0].type === 'Identifier' ||
            path.node.argument.arguments[0].type === 'NumericLiteral' ||
            path.node.argument.arguments[0].type === 'ConditionalExpression' ||
            path.node.argument.arguments[0].type === 'CallExpression' ||
            path.node.argument.arguments[0].type === 'ObjectExpression' ||
            path.node.argument.arguments[0].type === 'MemberExpression' ||
            !t.isExpression(path.node.argument.arguments[0]) ||
            !t.isIdentifier(path.node.argument.callee)
          ) {
            return
          }

          const errorName = path.node.argument.callee.name

          const errorMsgLiteral = evalToString(path.node.argument.arguments[0])

          if (errorMsgLiteral.includes('Super expression')) {
            // ignore Babel runtime error message
            return
          }

          // Attempt to get the existing index of the error. If it is not found, add it to the array as a new error.
          let errorIndex = errors.indexOf(errorMsgLiteral)
          if (errorIndex === -1) {
            errors.push(errorMsgLiteral)
            errorIndex = errors.length - 1
            changeInArray = true
          }

          // Import the error message function
          const formatProdErrorMessageIdentifier = helperModuleImports.addNamed(
            path,
            'formatProdErrorMessage',
            '@reduxjs/toolkit',
            { nameHint: 'formatProdErrorMessage' },
          )

          // Creates a function call to output the message to the error code page on the website
          const prodMessage = t.callExpression(
            formatProdErrorMessageIdentifier,
            [t.numericLiteral(errorIndex)],
          )

          if (minify) {
            path.replaceWith(
              t.throwStatement(
                t.newExpression(t.identifier(errorName), [prodMessage]),
              ),
            )
          } else {
            path.replaceWith(
              t.throwStatement(
                t.newExpression(t.identifier(errorName), [
                  t.conditionalExpression(
                    t.binaryExpression(
                      '===',
                      t.identifier('process.env.NODE_ENV'),
                      t.stringLiteral('production'),
                    ),
                    prodMessage,
                    path.node.argument.arguments[0],
                  ),
                ]),
              ),
            )
          }
        }
      },
    },
    post: () => {
      // If there is a new error in the array, convert it to an indexed object and write it back to the file.
      if (changeInArray) {
        fs.writeFileSync(errorsPath, JSON.stringify({ ...errors }, null, 2))
      }
    },
  }
}

export default mangleErrorsPlugin
