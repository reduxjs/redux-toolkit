import type { ExpressionKind, SpreadElementKind } from 'ast-types/gen/kinds'
import type {
  CallExpression,
  JSCodeshift,
  ObjectExpression,
  Transform
} from 'jscodeshift'
import type { TestOptions } from 'jscodeshift/src/testUtils'

type CallArgument = ExpressionKind | SpreadElementKind

function getStaticKeyName(
  property: ObjectExpression['properties'][number]
): string | undefined {
  if (
    (property.type === 'ObjectProperty' ||
      property.type === 'ObjectMethod' ||
      property.type === 'Property') &&
    !property.computed &&
    property.key.type === 'Identifier'
  ) {
    return property.key.name
  }
  return undefined
}

function getAddTagTypesArgs(
  j: JSCodeshift,
  addTagTypes: ExpressionKind
): CallArgument[] | undefined {
  if (
    addTagTypes.type === 'TSAsExpression' &&
    addTagTypes.expression.type === 'ArrayExpression'
  ) {
    addTagTypes = addTagTypes.expression
  }
  if (addTagTypes.type !== 'ArrayExpression') {
    return [j.spreadElement(addTagTypes)]
  }
  const args: CallArgument[] = []
  for (const element of addTagTypes.elements) {
    if (!element || element.type === 'RestElement') {
      return undefined
    }
    args.push(element as CallArgument)
  }
  return args
}

// `enhanceEndpoints` ignored callback return values, but `enhanceEndpoint` merges
// a returned object, so callbacks like `(d) => (d.x = y)` get a block body
function toEnhancement(j: JSCodeshift, value: ExpressionKind): ExpressionKind {
  if (
    value.type === 'ArrowFunctionExpression' &&
    value.body.type !== 'BlockStatement' &&
    value.body.type !== 'ObjectExpression'
  ) {
    const body = value.body as ExpressionKind & {
      extra?: { parenthesized?: boolean }
    }
    if (body.extra) {
      body.extra.parenthesized = false
    }
    value.body = j.blockStatement([j.expressionStatement(body)])
    value.expression = false
  }
  return value
}

function getEnhanceEndpointArgs(
  j: JSCodeshift,
  endpoints: ObjectExpression
): CallArgument[][] | undefined {
  const calls: CallArgument[][] = []
  for (const property of endpoints.properties) {
    if (property.type === 'ObjectMethod') {
      if (property.kind !== 'method' || property.generator) {
        return undefined
      }
      const name = getStaticKeyName(property)
      calls.push([
        name !== undefined
          ? j.stringLiteral(name)
          : (property.key as ExpressionKind),
        j.arrowFunctionExpression(property.params, property.body)
      ])
    } else if (
      property.type === 'ObjectProperty' ||
      property.type === 'Property'
    ) {
      if (property.value.type === 'AssignmentPattern') {
        return undefined
      }
      const name = getStaticKeyName(property)
      calls.push([
        name !== undefined
          ? j.stringLiteral(name)
          : (property.key as ExpressionKind),
        toEnhancement(j, property.value as ExpressionKind)
      ])
    } else {
      return undefined
    }
  }
  return calls
}

function buildReplacement(
  j: JSCodeshift,
  call: CallExpression
): ExpressionKind | undefined {
  const { callee } = call
  const [options] = call.arguments
  if (
    callee.type !== 'MemberExpression' ||
    call.arguments.length !== 1 ||
    options.type !== 'ObjectExpression'
  ) {
    return undefined
  }

  let addTagTypes: ExpressionKind | undefined
  let endpoints: ExpressionKind | undefined
  for (const property of options.properties) {
    const name = getStaticKeyName(property)
    if (
      (property.type !== 'ObjectProperty' && property.type !== 'Property') ||
      (name !== 'addTagTypes' && name !== 'endpoints')
    ) {
      return undefined
    }
    if (name === 'addTagTypes') {
      addTagTypes = property.value as ExpressionKind
    } else {
      endpoints = property.value as ExpressionKind
    }
  }

  let result = callee.object as ExpressionKind

  if (addTagTypes) {
    const args = getAddTagTypesArgs(j, addTagTypes)
    if (!args) {
      return undefined
    }
    result = j.callExpression(
      j.memberExpression(result, j.identifier('addTagTypes')),
      args
    )
  }

  if (endpoints) {
    if (endpoints.type !== 'ObjectExpression') {
      return undefined
    }
    const calls = getEnhanceEndpointArgs(j, endpoints)
    if (!calls) {
      return undefined
    }
    for (const args of calls) {
      result = j.callExpression(
        j.memberExpression(result, j.identifier('enhanceEndpoint')),
        args
      )
    }
  }

  return result === callee.object ? undefined : result
}

const transform: Transform = (file, api) => {
  const j = api.jscodeshift

  const root = j(file.source)

  // Innermost calls first, so chained `enhanceEndpoints` calls see already-converted receivers
  const paths = root
    .find(j.CallExpression, {
      callee: {
        type: 'MemberExpression',
        property: { name: 'enhanceEndpoints' }
      }
    })
    .paths()
    .reverse()

  for (const path of paths) {
    const replacement = buildReplacement(j, path.node)
    if (replacement) {
      j(path).replaceWith(replacement)
    }
  }

  return root.toSource({
    arrowParensAlways: true,
    lineTerminator: '\n',
    quote: 'single'
  })
}

export const parser = 'tsx' satisfies TestOptions['parser']

export default transform
