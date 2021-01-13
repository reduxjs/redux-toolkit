import * as ts from 'typescript';
import { getOperationName } from 'oazapfts/lib/codegen/generate';
import { capitalize, isQuery } from '../utils';
import { OperationDefinition } from '../types';

const { factory } = ts;

type GetReactHookNameParams = {
  operationDefinition: OperationDefinition;
};

const getReactHookName = ({ operationDefinition: { verb, path, operation } }: GetReactHookNameParams) =>
  factory.createBindingElement(
    undefined,
    undefined,
    factory.createIdentifier(
      `use${capitalize(getOperationName(verb, path, operation.operationId))}${isQuery(verb) ? 'Query' : 'Mutation'}`
    ),
    undefined
  );

type GenerateReactHooksParams = {
  exportName: string;
  operationDefinitions: OperationDefinition[];
};
export const generateReactHooks = ({ exportName, operationDefinitions }: GenerateReactHooksParams) =>
  factory.createVariableStatement(
    [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    factory.createVariableDeclarationList(
      [
        factory.createVariableDeclaration(
          factory.createObjectBindingPattern(
            operationDefinitions.map((operationDefinition) => getReactHookName({ operationDefinition }))
          ),
          undefined,
          undefined,
          factory.createIdentifier(exportName)
        ),
      ],
      ts.NodeFlags.Const
    )
  );
