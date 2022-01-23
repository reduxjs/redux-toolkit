import ts from 'typescript';
import { getOperationName } from '@rtk-query/oazapfts-patched/lib/codegen/generate';
import { capitalize, isQuery } from '../utils';
import type { OperationDefinition, EndpointOverrides } from '../types';
import { getOverrides } from '../generate';
import { factory } from '../utils/factory';

type GetReactHookNameParams = {
  operationDefinition: OperationDefinition;
  endpointOverrides: EndpointOverrides[] | undefined;
};

type CreateBindingParams = {
  operationDefinition: OperationDefinition;
  overrides?: EndpointOverrides;
  isLazy?: boolean;
};

const createBinding = ({
  operationDefinition: { verb, path, operation },
  overrides,
  isLazy = false,
}: CreateBindingParams) =>
  factory.createBindingElement(
    undefined,
    undefined,
    factory.createIdentifier(
      `use${isLazy ? 'Lazy' : ''}${capitalize(getOperationName(verb, path, operation.operationId))}${
        isQuery(verb, overrides) ? 'Query' : 'Mutation'
      }`
    ),
    undefined
  );

const getReactHookName = ({ operationDefinition, endpointOverrides }: GetReactHookNameParams) => {
  const overrides = getOverrides(operationDefinition, endpointOverrides);

  const baseParams = {
    operationDefinition,
    overrides,
  };

  return isQuery(operationDefinition.verb, overrides)
    ? [createBinding(baseParams), createBinding({ ...baseParams, isLazy: true })]
    : createBinding(baseParams);
};

type GenerateReactHooksParams = {
  exportName: string;
  operationDefinitions: OperationDefinition[];
  endpointOverrides: EndpointOverrides[] | undefined;
};
export const generateReactHooks = ({ exportName, operationDefinitions, endpointOverrides }: GenerateReactHooksParams) =>
  factory.createVariableStatement(
    [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    factory.createVariableDeclarationList(
      [
        factory.createVariableDeclaration(
          factory.createObjectBindingPattern(
            operationDefinitions
              .map((operationDefinition) => getReactHookName({ operationDefinition, endpointOverrides }))
              .flat()
          ),
          undefined,
          undefined,
          factory.createIdentifier(exportName)
        ),
      ],
      ts.NodeFlags.Const
    )
  );
