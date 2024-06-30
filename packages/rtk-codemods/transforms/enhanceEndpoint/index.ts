import type {
  Transform,
  MemberExpression,
  ObjectExpression,
  RestElement,
  JSCodeshift
} from 'jscodeshift'

type Prop = Extract<
  ObjectExpression['properties'][number],
  { value: unknown }
>['value']

const createAddTagTypesCall = (
  j: JSCodeshift,
  object: MemberExpression['object'],
  addTagTypes: Prop
) => {
  const newCall = j.callExpression(
    j.memberExpression(object, j.identifier('addTagTypes')),
    []
  )
  if (addTagTypes.type === 'Identifier') {
    newCall.arguments.push(j.spreadElement(addTagTypes))
  } else if (addTagTypes.type === 'ArrayExpression') {
    newCall.arguments = addTagTypes.elements.filter(
      (el): el is Exclude<typeof el, RestElement | null> =>
        !!(el && el.type !== 'RestElement')
    )
  }
  return newCall
}

const transform: Transform = (file, api) => {
  const j = api.jscodeshift

  const root = j(file.source)

  return root
    .find(j.CallExpression, {
      callee: {
        property: {
          name: 'enhanceEndpoints'
        }
      }
    })
    .forEach((path) => {
      const callee = path.value.callee as MemberExpression
      const [config] = path.value.arguments
      if (config.type === 'ObjectExpression') {
        let addTagTypes: Prop | undefined = undefined
        let endpoints: Prop | undefined = undefined
        for (const property of config.properties) {
          if (
            (property.type === 'ObjectProperty' ||
              property.type === 'Property') &&
            property.key.type === 'Identifier'
          ) {
            switch (property.key.name) {
              case 'addTagTypes':
                addTagTypes = property.value
                break
              case 'endpoints':
                endpoints = property.value
                break
            }
          }
        }
        if (!endpoints) {
          if (!addTagTypes) {
            return
          }
          // no endpoints - we can go ahead and replace
          path.replace(createAddTagTypesCall(j, callee.object, addTagTypes))
        } else {
          let calleeObject = addTagTypes
            ? createAddTagTypesCall(j, callee.object, addTagTypes)
            : callee.object
          if (endpoints.type === 'ObjectExpression') {
            for (const endpointProp of endpoints.properties) {
              if (endpointProp.type === 'ObjectProperty') {
                const endpointName =
                  endpointProp.key.type === 'Identifier' &&
                  !endpointProp.computed
                    ? j.stringLiteral(endpointProp.key.name)
                    : endpointProp.key
                calleeObject = j.callExpression(
                  j.memberExpression(
                    calleeObject,
                    j.identifier('enhanceEndpoint')
                  ),
                  [endpointName, endpointProp.value as any]
                )
              } else if (endpointProp.type === 'ObjectMethod') {
                const endpointName =
                  endpointProp.key.type === 'Identifier'
                    ? j.stringLiteral(endpointProp.key.name)
                    : endpointProp.key
                calleeObject = j.callExpression(
                  j.memberExpression(
                    calleeObject,
                    j.identifier('enhanceEndpoint')
                  ),
                  [
                    endpointName,
                    j.arrowFunctionExpression(
                      endpointProp.params,
                      endpointProp.body
                    )
                  ]
                )
              }
            }
          }
          path.replace(calleeObject)
        }
      }
    })
    .toSource({
      arrowParensAlways: true
    })
}

export const parser = 'tsx'

export default transform
