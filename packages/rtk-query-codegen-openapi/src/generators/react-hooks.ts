import ts from 'typescript';
import { getOverrides, resolveOperationName } from '../generate';
import type { CommonOptions, EndpointOverrides, OperationDefinition, OutputFileOptions } from '../types';
import { capitalize, isQuery } from '../utils';
import { factory } from '../utils/factory';

/**
 * The resolved value of the {@linkcode CommonOptions.hooks | hooks} option,
 * with `undefined` excluded. Either a `boolean` shorthand or an object
 * selecting which kinds of hooks to generate.
 *
 * @internal
 */
type HooksConfigOptions = NonNullable<CommonOptions['hooks']>;

/**
 * The inputs every hook-name builder in this file needs: the operation
 * being named, plus the naming options taken straight from
 * {@linkcode CommonOptions} so they are documented in exactly one place.
 *
 * @internal
 */
type HookNameBaseParams = Pick<CommonOptions, 'operationNameSuffix' | 'operationIdTransformer'> & {
  /**
   * The operation to generate hook bindings for.
   */
  operationDefinition: OperationDefinition;
};

/**
 * The parameters of {@linkcode createBinding()}.
 *
 * @internal
 */
type CreateBindingParams = HookNameBaseParams & {
  /**
   * The endpoint override matching the operation, if any. Its
   * {@linkcode EndpointOverrides.type | type} decides whether the hook is
   * named `...Query` or `...Mutation`.
   */
  overrides?: EndpointOverrides;

  /**
   * Whether to generate the lazy variant of a query hook, which is named
   * `useLazy...Query`.
   *
   * @default false
   */
  isLazy?: boolean;
};

/**
 * The parameters of {@linkcode getReactHookName()}. Unlike
 * {@linkcode CreateBindingParams} this takes the full override list, since
 * resolving the matching override is part of the job.
 *
 * @internal
 */
type GetReactHookNameParams = HookNameBaseParams &
  Pick<OutputFileOptions, 'endpointOverrides'> & {
    /**
     * Which kinds of hooks to generate.
     */
    config: HooksConfigOptions;
  };

/**
 * Creates a single binding element naming the generated hook for one
 * operation, e.g. `useGetPetByIdQuery`.
 *
 * @param params - The operation to bind, plus the naming options.
 * @returns A {@linkcode ts.BindingElement | BindingElement} holding the hook name.
 * @throws An {@linkcode Error} if the operation has no `operationId` and {@linkcode CreateBindingParams.operationIdTransformer | operationIdTransformer} is not `"camelCase"`.
 *
 * @internal
 */
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

/**
 * Creates the binding elements for a single operation, honoring the
 * {@linkcode CommonOptions.hooks | hooks} configuration.
 *
 * A query yields up to two bindings - the regular hook and its lazy
 * variant - so the result is an array in that case and a single binding
 * otherwise.
 *
 * @param params - The operation to bind, the hook configuration, and the naming options.
 * @returns The binding element(s) for the operation, or an empty array if the configuration disables them.
 *
 * @internal
 */
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

/**
 * The parameters of {@linkcode generateReactHooks()}.
 *
 * @internal
 */
type GenerateReactHooksParams = Omit<GetReactHookNameParams, 'operationDefinition'> & {
  /**
   * The identifier the hooks are destructured from. Note this is the
   * internal injected api const, not the
   * {@linkcode CommonOptions.exportName | exportName} option - the two are
   * bridged by a separate `export { <internal> as <exportName> }`
   * declaration.
   */
  exportName: string;

  /**
   * Every operation to generate hooks for.
   */
  operationDefinitions: OperationDefinition[];
};

/**
 * Builds the exported statement that destructures the generated hooks off
 * the injected api.
 *
 * @example
 * <caption>The generated statement</caption>
 *
 * ```ts
 * export const { useAddPetMutation, useGetPetByIdQuery } = injectedRtkApi;
 * ```
 *
 * @param params - The identifier to destructure from, the operations to bind, and the hook configuration.
 * @returns A {@linkcode ts.VariableStatement | VariableStatement} destructuring the hooks from the injected api.
 *
 * @since 1.0.0
 * @public
 */
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
