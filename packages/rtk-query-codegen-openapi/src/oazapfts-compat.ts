/**
 * Compatibility adapter for oazapfts v7.
 *
 * oazapfts v7 removed the `ApiGenerator` class and `oazapfts/generate` export.
 * This module provides equivalent functionality using v7's public API
 * (`createContext`, `UNSTABLE_cg`) combined with local implementations of
 * helper functions that are no longer publicly exported.
 *
 * Type generation is done lazily (on demand) to match v6's behavior,
 * ensuring that only types referenced by the generated endpoints are included.
 */
import { createContext, type OazapftsContext } from 'oazapfts/context';
import { UNSTABLE_cg as cg } from 'oazapfts';
import type { OpenAPIV3 } from 'openapi-types';
import lodashCamelCase from 'lodash.camelcase';
import ts from 'typescript';

const factory = ts.factory;

export const createPropertyAssignment: typeof cg.createPropertyAssignment =
  cg.createPropertyAssignment;
export const createQuestionToken: typeof cg.createQuestionToken =
  cg.createQuestionToken;
export const keywordType: typeof cg.keywordType = cg.keywordType;
export const isValidIdentifier: typeof cg.isValidIdentifier =
  cg.isValidIdentifier;

export function isReference(
  obj: unknown
): obj is OpenAPIV3.ReferenceObject {
  return typeof obj === 'object' && obj !== null && '$ref' in (obj as any);
}

export function getReferenceName(
  obj: unknown
): string | undefined {
  if (isReference(obj)) {
    return obj.$ref.split('/').pop();
  }
}

export function getOperationName(
  verb: string,
  path: string,
  operationId?: string
): string {
  if (operationId) {
    const normalized = operationId.replace(/[^\w\s]/g, ' ');
    let camelCased = lodashCamelCase(normalized);
    if (camelCased) {
      camelCased = camelCased.replace(/^[^a-zA-Z_$]+/, '');
      if (camelCased && isValidIdentifier(camelCased)) {
        return camelCased;
      }
    }
  }
  const pathStr = path
    .replace(/\{(.+?)\}/, 'by $1')
    .replace(/\{(.+?)\}/, 'and $1');
  return lodashCamelCase(`${verb} ${pathStr}`);
}

export function supportDeepObjects(
  params: OpenAPIV3.ParameterObject[]
): OpenAPIV3.ParameterObject[] {
  const res: OpenAPIV3.ParameterObject[] = [];
  const merged: Record<string, any> = {};
  for (const p of params) {
    const m = /^(.+?)\[(.*?)\]/.exec(p.name);
    if (!m) {
      res.push(p);
      continue;
    }
    const [, name, prop] = m;
    let obj = merged[name];
    if (!obj) {
      obj = merged[name] = {
        name,
        in: p.in,
        style: 'deepObject',
        schema: {
          type: 'object',
          properties: {} as Record<string, any>,
        },
      };
      res.push(obj);
    }
    obj.schema.properties[prop] = p.schema;
  }
  return res;
}

const jsonMimeTypes: Record<string, boolean> = {
  '*/*': true,
  'application/json': true,
};

function isJsonMimeType(mime: string): boolean {
  return !!jsonMimeTypes[mime] || /\bjson\b/i.test(mime);
}

function isMimeType(s: string): boolean {
  return /^[^/]+\/[^/]+$/.test(s);
}

export function getSchemaFromContent(
  content: Record<string, OpenAPIV3.MediaTypeObject>
): OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject {
  const contentType = Object.keys(content).find(isMimeType);
  if (contentType) {
    const { schema } = content[contentType];
    if (schema) {
      return schema;
    }
  }
  if (
    Object.keys(content).length === 0 ||
    Object.keys(content).some((type) => type.startsWith('text/'))
  ) {
    return { type: 'string' };
  }
  return { type: 'string', format: 'binary' };
}

function toIdentifier(s: string, isTypeName = false): string {
  let result = lodashCamelCase(s);
  if (isTypeName && result) {
    result = result.charAt(0).toUpperCase() + result.slice(1);
  }
  return result || s;
}

type OnlyMode = 'readOnly' | 'writeOnly';

export interface OazapftsAdapterOptions {
  useEnumType?: boolean;
  unionUndefined?: boolean;
  mergeReadWriteOnly?: boolean;
  useUnknown?: boolean;
}

export class OazapftsAdapter {
  public ctx: OazapftsContext;
  private opts: OazapftsAdapterOptions;

  constructor(doc: OpenAPIV3.Document, opts: OazapftsAdapterOptions) {
    this.opts = opts;
    this.ctx = createContext(doc as any, {
      useEnumType: opts.useEnumType,
      unionUndefined: opts.unionUndefined,
      mergeReadWriteOnly: opts.mergeReadWriteOnly,
      useUnknown: opts.useUnknown,
    });
  }

  get spec(): OpenAPIV3.Document {
    return this.ctx.spec as unknown as OpenAPIV3.Document;
  }

  get aliases() {
    return this.ctx.aliases;
  }

  get enumAliases(): ts.Statement[] {
    return this.ctx.enumAliases;
  }

  /**
   * Initialize the adapter. Preprocesses components for discriminated union support.
   */
  async init(): Promise<void> {
    this.preprocessComponents();
    this.makeDiscriminatorPropertiesRequired();
  }

  resolve<T>(obj: T | OpenAPIV3.ReferenceObject): T {
    if (!isReference(obj)) return obj;
    const pathParts = obj.$ref.replace(/^#\//, '').split('/');
    const resolved = pathParts.reduce<any>(
      (current, part) => current?.[part],
      this.ctx.spec
    );
    if (resolved === undefined) {
      throw new Error(`Can't resolve ${obj.$ref}`);
    }
    return resolved as T;
  }

  resolveArray<T>(
    array?: Array<T | OpenAPIV3.ReferenceObject>
  ): T[] {
    return array ? array.map((el) => this.resolve(el)) : [];
  }

  /**
   * Preprocess components for discriminated union support.
   */
  private preprocessComponents(): void {
    const schemas = (this.ctx.spec as any).components?.schemas;
    if (!schemas) return;

    const prefix = '#/components/schemas/';

    // First pass: identify discriminating schemas
    for (const name of Object.keys(schemas)) {
      const schema = schemas[name];
      if (isReference(schema) || typeof schema === 'boolean') continue;
      if (schema.discriminator && !schema.oneOf && !schema.anyOf) {
        this.ctx.discriminatingSchemas.add(schema);
      }
    }

    // Second pass: make mappings explicit
    for (const name of Object.keys(schemas)) {
      const schema = schemas[name];
      if (isReference(schema) || typeof schema === 'boolean' || !schema.allOf) continue;

      for (const childSchema of schema.allOf) {
        if (!isReference(childSchema)) continue;
        const resolved = this.resolve<OpenAPIV3.SchemaObject>(childSchema);
        if (!this.ctx.discriminatingSchemas.has(resolved as any)) continue;

        const refBasename = childSchema.$ref.split('/').pop()!;
        const discriminatingSchema = schemas[refBasename];
        if (isReference(discriminatingSchema)) continue;

        const discriminator = discriminatingSchema.discriminator;
        if (!discriminator) continue;

        const refs = Object.values(discriminator.mapping || {});
        if (refs.includes(prefix + name)) continue;

        if (!discriminator.mapping) {
          discriminator.mapping = {};
        }
        discriminator.mapping[name] = prefix + name;
      }
    }
  }

  getResponseType(
    responses?: OpenAPIV3.ResponsesObject
  ): 'json' | 'text' | 'blob' {
    if (!responses) return 'text';

    const resolvedResponses = Object.values(responses).map((response) =>
      this.resolve(response)
    );

    if (
      !resolvedResponses.some(
        (res) => Object.keys(res.content ?? {}).length > 0
      )
    ) {
      return 'text';
    }

    const hasJson = resolvedResponses.some((response) => {
      const responseMimeTypes = Object.keys(response.content ?? {});
      return responseMimeTypes.some(isJsonMimeType);
    });

    if (hasJson) return 'json';

    if (
      resolvedResponses.some((res) =>
        Object.keys(res.content ?? {}).some((type) => type.startsWith('text/'))
      )
    ) {
      return 'text';
    }

    return 'blob';
  }

  getTypeFromResponse(
    response: OpenAPIV3.ResponseObject | OpenAPIV3.ReferenceObject,
    onlyMode?: OnlyMode
  ): ts.TypeNode {
    const resolved = this.resolve(response);
    if (!resolved.content) return keywordType.void;
    const schema = getSchemaFromContent(resolved.content);
    return this.getTypeFromSchema(schema, undefined, onlyMode);
  }

  getTypeFromSchema(
    schema?: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
    name?: string,
    onlyMode?: OnlyMode
  ): ts.TypeNode {
    if (schema === undefined) {
      return this.opts.useUnknown ? keywordType.unknown : keywordType.any;
    }

    if (isReference(schema)) {
      return this.getRefAlias(schema, onlyMode);
    }

    const type = this.resolveBaseSchema(schema, name, onlyMode);
    if (schema.nullable) {
      return factory.createUnionTypeNode([type, keywordType.null]);
    }
    return type;
  }

  /**
   * Create or look up a type alias for a $ref schema.
   * Lazily creates type aliases and stores them in ctx.aliases/ctx.refs.
   */
  private getRefAlias(
    obj: OpenAPIV3.ReferenceObject,
    onlyMode?: OnlyMode
  ): ts.TypeNode {
    const $ref = obj.$ref;

    if (!this.ctx.refs[$ref]) {
      const schema = this.resolve<OpenAPIV3.SchemaObject>(obj);
      const name =
        (typeof schema === 'object' && schema.title) ||
        $ref.split('/').pop()!;
      const identifier = toIdentifier(name, true);

      const isDiscriminating = this.ctx.discriminatingSchemas.has(schema as any);
      const alias = this.getUniqueAlias(
        isDiscriminating ? identifier + 'Base' : identifier
      );

      this.ctx.refs[$ref] = {
        base: factory.createTypeReferenceNode(alias, undefined),
        readOnly: undefined,
        writeOnly: undefined,
      };

      const type = this.resolveBaseSchema(schema, undefined, undefined, $ref);
      const nullable = schema.nullable
        ? factory.createUnionTypeNode([type, keywordType.null])
        : type;

      this.ctx.aliases.push(
        factory.createTypeAliasDeclaration(
          [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
          alias,
          undefined,
          nullable
        )
      );

      if (!this.opts.mergeReadWriteOnly) {
        const { hasReadOnly, hasWriteOnly } = this.checkSchemaOnlyMode(schema);

        if (hasReadOnly) {
          const readOnlyAlias = this.getUniqueAlias(
            toIdentifier(name + 'Read', true)
          );
          const readOnlyType = this.resolveBaseSchema(schema, undefined, 'readOnly');
          const readOnlyNullable = schema.nullable
            ? factory.createUnionTypeNode([readOnlyType, keywordType.null])
            : readOnlyType;
          this.ctx.refs[$ref].readOnly = factory.createTypeReferenceNode(
            readOnlyAlias,
            undefined
          );
          this.ctx.aliases.push(
            factory.createTypeAliasDeclaration(
              [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
              readOnlyAlias,
              undefined,
              readOnlyNullable
            )
          );
        }

        if (hasWriteOnly) {
          const writeOnlyAlias = this.getUniqueAlias(
            toIdentifier(name + 'Write', true)
          );
          const writeOnlyType = this.resolveBaseSchema(schema, undefined, 'writeOnly');
          const writeOnlyNullable = schema.nullable
            ? factory.createUnionTypeNode([writeOnlyType, keywordType.null])
            : writeOnlyType;
          this.ctx.refs[$ref].writeOnly = factory.createTypeReferenceNode(
            writeOnlyAlias,
            undefined
          );
          this.ctx.aliases.push(
            factory.createTypeAliasDeclaration(
              [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
              writeOnlyAlias,
              undefined,
              writeOnlyNullable
            )
          );
        }
      }
    }

    const entry = this.ctx.refs[$ref];
    return entry[onlyMode || 'base'] ?? entry.base;
  }

  private getUniqueAlias(name: string): string {
    const count = this.ctx.typeAliases[name];
    if (count === undefined) {
      this.ctx.typeAliases[name] = 1;
      return name;
    }
    this.ctx.typeAliases[name] = count + 1;
    return `${name}${count + 1}`;
  }

  private checkSchemaOnlyMode(schema: OpenAPIV3.SchemaObject): {
    hasReadOnly: boolean;
    hasWriteOnly: boolean;
  } {
    if (this.opts.mergeReadWriteOnly) {
      return { hasReadOnly: false, hasWriteOnly: false };
    }

    let hasReadOnly = false;
    let hasWriteOnly = false;

    if (schema.properties) {
      for (const prop of Object.values(schema.properties)) {
        if (isReference(prop)) continue;
        if (prop.readOnly) hasReadOnly = true;
        if (prop.writeOnly) hasWriteOnly = true;
      }
    }

    return { hasReadOnly, hasWriteOnly };
  }

  /**
   * For schemas with discriminator + oneOf/anyOf:
   * 1. Populate implicit discriminator mappings (using enum values from child schemas)
   * 2. Make the discriminator property required in child schemas
   */
  private makeDiscriminatorPropertiesRequired(): void {
    const schemas = (this.ctx.spec as any).components?.schemas;
    if (!schemas) return;
    const prefix = '#/components/schemas/';

    for (const name of Object.keys(schemas)) {
      const schema = schemas[name];
      if (isReference(schema) || typeof schema === 'boolean') continue;
      if (!schema.discriminator) continue;

      const discriminator = schema.discriminator;
      const propName = discriminator.propertyName;
      const refs = schema.oneOf || schema.anyOf || [];

      for (const ref of refs) {
        if (!isReference(ref)) continue;
        const childName = ref.$ref.split('/').pop();
        if (!childName) continue;
        const childSchema = schemas[childName];
        if (!childSchema || isReference(childSchema) || typeof childSchema === 'boolean') continue;

        // Make discriminator property required
        if (!childSchema.required) childSchema.required = [];
        if (!childSchema.required.includes(propName)) {
          childSchema.required.push(propName);
        }

        // Populate implicit mapping if not already present
        if (!discriminator.mapping) {
          discriminator.mapping = {};
        }
        const alreadyMapped = Object.values(discriminator.mapping).some(
          (v) => (v as string).split('/').pop() === childName
        );
        if (!alreadyMapped) {
          // Use the enum value from the child's discriminator property if available
          const discProp = childSchema.properties?.[propName];
          if (
            discProp &&
            !isReference(discProp) &&
            discProp.enum?.length === 1
          ) {
            discriminator.mapping[String(discProp.enum[0])] =
              prefix + childName;
          } else {
            discriminator.mapping[childName] = prefix + childName;
          }
        }
      }
    }
  }

  private resolveBaseSchema(
    schema: OpenAPIV3.SchemaObject,
    _name?: string,
    onlyMode?: OnlyMode,
    currentRef?: string
  ): ts.TypeNode {
    if (schema.oneOf) {
      return this.resolveCompositionSchema(schema.oneOf, 'oneOf', schema, onlyMode);
    }

    if (schema.anyOf) {
      return this.resolveCompositionSchema(schema.anyOf, 'anyOf', schema, onlyMode);
    }

    if (schema.allOf) {
      return this.resolveAllOfSchema(schema, onlyMode, currentRef);
    }

    if (schema.enum) {
      return this.createEnumTypeNode(schema.enum);
    }

    switch (schema.type) {
      case 'string':
        if (schema.format === 'binary') {
          return factory.createTypeReferenceNode('Blob');
        }
        return keywordType.string;
      case 'number':
      case 'integer':
        return keywordType.number;
      case 'boolean':
        return keywordType.boolean;
      case 'array':
        if (schema.items) {
          const itemType = this.getTypeFromSchema(
            schema.items,
            undefined,
            onlyMode
          );
          return factory.createArrayTypeNode(itemType);
        }
        return factory.createArrayTypeNode(keywordType.any);
      case 'object':
        return this.resolveObjectSchema(schema, onlyMode, true);
      default:
        return this.resolveObjectSchema(schema, onlyMode, false);
    }
  }

  /**
   * Handle oneOf/anyOf composition, with discriminator support.
   * When a discriminator is present, each variant becomes
   * `{ discriminatorProp: "value" } & ChildType`.
   */
  private resolveCompositionSchema(
    variants: (OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject)[],
    _kind: 'oneOf' | 'anyOf',
    parentSchema: OpenAPIV3.SchemaObject,
    onlyMode?: OnlyMode
  ): ts.TypeNode {
    const discriminator = parentSchema.discriminator;

    const types = variants.map((s) => {
      const childType = this.getTypeFromSchema(s, undefined, onlyMode);

      if (discriminator && isReference(s)) {
        const value = this.getDiscriminatorValueForRef(discriminator, s.$ref);
        if (value !== undefined) {
          const discLiteral = factory.createTypeLiteralNode([
            factory.createPropertySignature(
              undefined,
              factory.createIdentifier(discriminator.propertyName),
              undefined,
              factory.createLiteralTypeNode(factory.createStringLiteral(value))
            ),
          ]);
          return factory.createIntersectionTypeNode([discLiteral, childType]);
        }
      }

      return childType;
    });

    return types.length === 1 ? types[0] : factory.createUnionTypeNode(types);
  }

  /**
   * Handle allOf composition, with discriminator + own properties support.
   * When a schema has both allOf and its own properties, the result is
   * an intersection of all allOf items plus a type literal for own properties.
   * When an allOf item references a discriminating schema, a discriminator
   * literal type is prepended.
   */
  private resolveAllOfSchema(
    schema: OpenAPIV3.SchemaObject,
    onlyMode?: OnlyMode,
    currentRef?: string
  ): ts.TypeNode {
    const types: ts.TypeNode[] = [];

    for (const s of schema.allOf!) {
      // Check if this allOf item references a discriminating schema
      if (isReference(s)) {
        const resolved = this.resolve<OpenAPIV3.SchemaObject>(s);
        if (
          this.ctx.discriminatingSchemas.has(resolved as any) &&
          resolved.discriminator
        ) {
          const value = currentRef
            ? this.getDiscriminatorValueForRef(
                resolved.discriminator,
                currentRef
              )
            : undefined;
          if (value !== undefined) {
            types.push(
              factory.createTypeLiteralNode([
                factory.createPropertySignature(
                  undefined,
                  factory.createIdentifier(
                    resolved.discriminator.propertyName
                  ),
                  undefined,
                  factory.createLiteralTypeNode(
                    factory.createStringLiteral(value)
                  )
                ),
              ])
            );
          }
        }
      }
      types.push(this.getTypeFromSchema(s, undefined, onlyMode));
    }

    if (schema.properties) {
      types.push(this.resolveObjectSchema(schema, onlyMode));
    }

    return types.length === 1
      ? types[0]
      : factory.createIntersectionTypeNode(types);
  }

  /**
   * Look up the discriminator value for a given $ref in a discriminator mapping.
   */
  private getDiscriminatorValueForRef(
    discriminator: OpenAPIV3.DiscriminatorObject,
    targetRef: string
  ): string | undefined {
    const mapping = discriminator.mapping || {};
    const targetName = targetRef.split('/').pop();
    for (const [key, ref] of Object.entries(mapping)) {
      const refName = ref.split('/').pop();
      if (refName === targetName) return key;
    }
    return undefined;
  }

  private resolveObjectSchema(
    schema: OpenAPIV3.SchemaObject,
    onlyMode?: OnlyMode,
    isExplicitObject = false
  ): ts.TypeNode {
    if (schema.properties) {
      const members: ts.TypeElement[] = Object.entries(schema.properties)
        .filter(([, prop]) => {
          if (isReference(prop)) return true;
          if (this.opts.mergeReadWriteOnly) return true;
          switch (onlyMode) {
            case 'readOnly':
              return !prop.writeOnly;
            case 'writeOnly':
              return !prop.readOnly;
            default:
              // Base type: exclude both readOnly and writeOnly props
              return !prop.readOnly && !prop.writeOnly;
          }
        })
        .map(([name, prop]) => {
          const propType = this.getTypeFromSchema(prop, undefined, onlyMode);
          const isRequired = schema.required?.includes(name) ?? false;
          const optionalType =
            !isRequired && this.opts.unionUndefined
              ? factory.createUnionTypeNode([propType, keywordType.undefined])
              : propType;
          const signature = factory.createPropertySignature(
            undefined,
            isValidIdentifier(name)
              ? factory.createIdentifier(name)
              : factory.createStringLiteral(name),
            isRequired
              ? undefined
              : factory.createToken(ts.SyntaxKind.QuestionToken),
            optionalType
          );
          const resolvedProp = isReference(prop) ? this.resolve(prop) : prop;
          if (
            typeof resolvedProp === 'object' &&
            'description' in resolvedProp &&
            resolvedProp.description
          ) {
            const description = resolvedProp.description.replace('*/', '*\\/');
            return ts.addSyntheticLeadingComment(
              signature,
              ts.SyntaxKind.MultiLineCommentTrivia,
              `* ${description} `,
              true
            );
          }
          return signature;
        });

      if (schema.additionalProperties) {
        const valueType =
          schema.additionalProperties === true
            ? keywordType.any
            : this.getTypeFromSchema(
                schema.additionalProperties,
                undefined,
                onlyMode
              );
        members.push(
          factory.createIndexSignature(
            undefined,
            [
              factory.createParameterDeclaration(
                undefined,
                undefined,
                'key',
                undefined,
                keywordType.string
              ),
            ],
            valueType
          )
        );
      }

      return factory.createTypeLiteralNode(members);
    }

    if (schema.additionalProperties) {
      const valueType =
        schema.additionalProperties === true
          ? keywordType.any
          : this.getTypeFromSchema(
              schema.additionalProperties,
              undefined,
              onlyMode
            );
      return factory.createTypeLiteralNode([
        factory.createIndexSignature(
          undefined,
          [
            factory.createParameterDeclaration(
              undefined,
              undefined,
              'key',
              undefined,
              keywordType.string
            ),
          ],
          valueType
        ),
      ]);
    }

    if (isExplicitObject) {
      return factory.createKeywordTypeNode(ts.SyntaxKind.ObjectKeyword);
    }
    return this.opts.useUnknown ? keywordType.unknown : keywordType.any;
  }

  private createEnumTypeNode(
    values: Array<string | number | boolean | null>
  ): ts.TypeNode {
    const types = values.map((v) => {
      if (v === null) return keywordType.null;
      switch (typeof v) {
        case 'string':
          return factory.createLiteralTypeNode(factory.createStringLiteral(v));
        case 'number':
          return factory.createLiteralTypeNode(
            factory.createNumericLiteral(String(v))
          );
        case 'boolean':
          return factory.createLiteralTypeNode(
            v ? factory.createTrue() : factory.createFalse()
          );
        default:
          return keywordType.string;
      }
    });
    return types.length === 1 ? types[0] : factory.createUnionTypeNode(types);
  }
}
