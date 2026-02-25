import ts from 'typescript';
import { getOverrides, resolveOperationName } from '../generate';
import type { ConfigFile, EndpointOverrides, OperationDefinition, OperationIdTransformer } from '../types';
import { capitalize, isQuery } from '../utils';
import { factory } from '../utils/factory';

type HooksConfigOptions = NonNullable<ConfigFile['hooks']>;

type GetReactHookNameParams = {
  operationDefinition: OperationDefinition;
  endpointOverrides: EndpointOverrides[] | undefined;
  config: HooksConfigOptions;
  operationNameSuffix?: string;
  operationIdTransformer?: OperationIdTransformer;
};

type CreateBindingParams = {
  operationDefinition: OperationDefinition;
  overrides?: EndpointOverrides;
  isLazy?: boolean;
  operationNameSuffix?: string;
  operationIdTransformer?: OperationIdTransformer;
};

const createBinding = ({
  operationDefinition: { verb, path, operation },
  overrides,
  isLazy = false,
  operationNameSuffix,
  operationIdTransformer,
}: CreateBindingParams) =>
  factory.createBindingElement(
    undefined,
    undefined,
    factory.createIdentifier(
      `use${isLazy ? 'Lazy' : ''}${capitalize(resolveOperationName({ verb, path, operation }, operationIdTransformer))}${operationNameSuffix ?? ''}${
        isQuery(verb, overrides) ? 'Query' : 'Mutation'
      }`
    ),
    undefined
  );

const getReactHookName = ({
  operationDefinition,
  endpointOverrides,
  config,
  operationNameSuffix,
  operationIdTransformer,
}: GetReactHookNameParams) => {
  const overrides = getOverrides(operationDefinition, endpointOverrides, operationIdTransformer);

  const baseParams = {
    operationDefinition,
    overrides,
    operationNameSuffix,
    operationIdTransformer,
  };

  const _isQuery = isQuery(operationDefinition.verb, overrides);

  // If `config` is true, just generate everything
  if (typeof config === 'boolean') {
    return createBinding(baseParams);
  }

  // `config` is an object and we need to check for the configuration of each property
  if (_isQuery) {
    return [
      ...(config.queries ? [createBinding(baseParams)] : []),
      ...(config.lazyQueries ? [createBinding({ ...baseParams, isLazy: true })] : []),
    ];
  }

  return config.mutations ? createBinding(baseParams) : [];
};

type GenerateReactHooksParams = {
  exportName: string;
  operationDefinitions: OperationDefinition[];
  endpointOverrides: EndpointOverrides[] | undefined;
  config: HooksConfigOptions;
  operationNameSuffix?: string;
  operationIdTransformer?: OperationIdTransformer;
};
export const generateReactHooks = ({
  exportName,
  operationDefinitions,
  endpointOverrides,
  config,
  operationNameSuffix,
  operationIdTransformer,
}: GenerateReactHooksParams) =>
  factory.createVariableStatement(
    [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    factory.createVariableDeclarationList(
      [
        factory.createVariableDeclaration(
          factory.createObjectBindingPattern(
            operationDefinitions
              .map((operationDefinition) =>
                getReactHookName({
                  operationDefinition,
                  endpointOverrides,
                  config,
                  operationNameSuffix,
                  operationIdTransformer,
                })
              )
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
