import type { ExpressionKind } from 'ast-types/gen/kinds'
import type {
  JSCodeshift,
  ObjectExpression,
  ObjectProperty,
  Transform
} from 'jscodeshift'
import type { TestOptions } from 'jscodeshift/src/testUtils'

type CreatorCallRestArguments =
  | [type: 'reducer', reducer: ExpressionKind]
  | [type: 'preparedReducer', prepare: ExpressionKind, reducer: ExpressionKind]

function creatorCall(j: JSCodeshift, ...rest: CreatorCallRestArguments) {
  const [type, ...restArgs] = rest

  return j.callExpression(
    j.memberExpression(j.identifier('create'), j.identifier(type)),
    restArgs
  )
}

export function reducerPropsToBuilderExpression(
  j: JSCodeshift,
  defNode: ObjectExpression
) {
  const returnedObject = j.objectExpression([])
  for (const property of defNode.properties) {
    let finalProp: ObjectProperty | undefined
    switch (property.type) {
      case 'ObjectMethod': {
        const { key, params, body } = property
        finalProp = j.objectProperty(
          key,
          creatorCall(j, 'reducer', j.arrowFunctionExpression(params, body))
        )
        break
      }
      case 'ObjectProperty': {
        const { key } = property

        switch (property.value.type) {
          case 'ObjectExpression': {
            const preparedReducerParams: {
              prepare?: ExpressionKind
              reducer?: ExpressionKind
            } = {}

            for (const objProp of property.value.properties) {
              switch (objProp.type) {
                case 'ObjectMethod': {
                  const { key, params, body } = objProp
                  if (
                    key.type === 'Identifier' &&
                    (key.name === 'reducer' || key.name === 'prepare')
                  ) {
                    preparedReducerParams[key.name] = j.arrowFunctionExpression(
                      params,
                      body
                    )
                  }
                  break
                }
                case 'ObjectProperty': {
                  const { key, value } = objProp

                  let finalExpression: ExpressionKind | undefined = undefined

                  switch (value.type) {
                    case 'ArrowFunctionExpression':
                    case 'FunctionExpression':
                    case 'Identifier':
                    case 'MemberExpression':
                    case 'CallExpression': {
                      finalExpression = value
                    }
                  }

                  if (
                    key.type === 'Identifier' &&
                    (key.name === 'reducer' || key.name === 'prepare') &&
                    finalExpression
                  ) {
                    preparedReducerParams[key.name] = finalExpression
                  }
                  break
                }
              }
            }

            if (
              preparedReducerParams.prepare &&
              preparedReducerParams.reducer
            ) {
              finalProp = j.objectProperty(
                key,
                creatorCall(
                  j,
                  'preparedReducer',
                  preparedReducerParams.prepare,
                  preparedReducerParams.reducer
                )
              )
            } else if (preparedReducerParams.reducer) {
              finalProp = j.objectProperty(
                key,
                creatorCall(j, 'reducer', preparedReducerParams.reducer)
              )
            }
            break
          }
          case 'ArrowFunctionExpression':
          case 'FunctionExpression':
          case 'Identifier':
          case 'MemberExpression':
          case 'CallExpression': {
            const { value } = property
            finalProp = j.objectProperty(key, creatorCall(j, 'reducer', value))
            break
          }
        }
        break
      }
    }
    if (!finalProp) {
      continue
    }
    returnedObject.properties.push(finalProp)
  }

  return j.arrowFunctionExpression(
    [j.identifier('create')],
    returnedObject,
    true
  )
}

const transform: Transform = (file, api) => {
  const j = api.jscodeshift

  return j(file.source)
    .find(j.CallExpression, {
      callee: { name: 'createSlice' },
      arguments: [{ type: 'ObjectExpression' }]
    })

    .filter((path) => {
      const createSliceArgsObject = path.node.arguments[0] as ObjectExpression
      return createSliceArgsObject.properties.some(
        (p) =>
          p.type === 'ObjectProperty' &&
          p.key.type === 'Identifier' &&
          p.key.name === 'reducers' &&
          p.value.type === 'ObjectExpression'
      )
    })
    .forEach((path) => {
      const createSliceArgsObject = path.node.arguments[0] as ObjectExpression
      j(path).replaceWith(
        j.callExpression(j.identifier('createSlice'), [
          j.objectExpression(
            createSliceArgsObject.properties.map((p) => {
              if (
                p.type === 'ObjectProperty' &&
                p.key.type === 'Identifier' &&
                p.key.name === 'reducers' &&
                p.value.type === 'ObjectExpression'
              ) {
                const expressionStatement = reducerPropsToBuilderExpression(
                  j,
                  p.value
                )
                return j.objectProperty(p.key, expressionStatement)
              }
              return p
            })
          )
        ])
      )
    })
    .toSource({
      arrowParensAlways: true,
      lineTerminator: '\n'
    })
}

export const parser = 'tsx' satisfies TestOptions['parser']

export default transform
