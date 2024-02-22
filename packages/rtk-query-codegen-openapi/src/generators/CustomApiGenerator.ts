import { Opts } from 'oazapfts/lib/codegen';
import ApiGenerator from 'oazapfts/lib/codegen/generate';
import { OpenAPIV3 } from 'openapi-types';
import typescript, {
  __String,
  TypeNode,
} from 'typescript';

import { UuidHandlingOptions } from '../types';

export class CustomApiGenerator extends ApiGenerator {

	uuidHandlingOptions: UuidHandlingOptions | null;
	allPropertiesRequired: boolean;

	constructor(uuidHandlingOptions: UuidHandlingOptions | null, allPropertiesRequired: boolean, spec: OpenAPIV3.Document<{}>, opts?: Opts | undefined) {
		super(spec, opts);
		this.uuidHandlingOptions = uuidHandlingOptions;
		this.allPropertiesRequired = allPropertiesRequired;
	}

	override getBaseTypeFromSchema(schema?: OpenAPIV3.ReferenceObject | (OpenAPIV3.SchemaObject & { const?: unknown; "x-enumNames"?: string[] | undefined; "x-enum-varnames"?: string[] | undefined; "x-component-ref-path"?: string | undefined; prefixItems?: (OpenAPIV3.ReferenceObject | (OpenAPIV3.SchemaObject & any))[] | undefined; }) | undefined, name?: string | undefined, onlyMode?: ('readOnly' | 'writeOnly') | undefined): TypeNode {
		if (this.uuidHandlingOptions) {
			const baseObj = schema as OpenAPIV3.BaseSchemaObject;

			if (baseObj && baseObj.format) {
				if (baseObj.format === "uuid")
					return typescript.factory.createTypeReferenceNode(this.uuidHandlingOptions.typeName, undefined);
			}
		}

		return super.getBaseTypeFromSchema(schema, name, onlyMode);
	}

	override getTypeFromProperties(props: { [prop: string]: OpenAPIV3.ReferenceObject | (OpenAPIV3.SchemaObject & { const?: unknown; "x-enumNames"?: string[] | undefined; "x-enum-varnames"?: string[] | undefined; "x-component-ref-path"?: string | undefined; prefixItems?: (OpenAPIV3.ReferenceObject | (OpenAPIV3.SchemaObject & any))[] | undefined; }); }, required?: string[] | undefined, additionalProperties?: boolean | OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject | undefined, onlyMode?: ('readOnly' | 'writeOnly') | undefined): typescript.TypeLiteralNode {
		const propertyNames = Object.keys(props);
		return super.getTypeFromProperties(props, this.allPropertiesRequired ? propertyNames : required, additionalProperties, onlyMode);
	}

	override preprocessComponents(schemas: { [key: string]: OpenAPIV3.ReferenceObject | (OpenAPIV3.SchemaObject & { const?: unknown; "x-enumNames"?: string[] | undefined; "x-enum-varnames"?: string[] | undefined; "x-component-ref-path"?: string | undefined; prefixItems?: (OpenAPIV3.ReferenceObject | (OpenAPIV3.SchemaObject & any))[] | undefined; }); }): void {
		super.preprocessComponents(schemas);
	}
	
	override resolve<T>(obj: OpenAPIV3.ReferenceObject | T): T {
		return super.resolve<T>(obj);
	}
	
	override getTypeFromParameter(p: OpenAPIV3.ParameterObject): TypeNode {
		const node = super.getTypeFromParameter(p);

		console.log('node', node);
		return node;
	}
}