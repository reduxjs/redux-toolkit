import type { StandardSchemaV1 } from '@standard-schema/spec'
import { SchemaError } from '@standard-schema/utils'

export class NamedSchemaError extends SchemaError {
  constructor(
    issues: readonly StandardSchemaV1.Issue[],
    public readonly value: any,
    public readonly schemaName: string,
    public readonly _bqMeta: any,
  ) {
    super(issues)
  }
}

export async function parseWithSchema<Schema extends StandardSchemaV1>(
  schema: Schema,
  data: unknown,
  schemaName: string,
  bqMeta: any,
): Promise<StandardSchemaV1.InferOutput<Schema>> {
  const result = await schema['~standard'].validate(data)
  if (result.issues) {
    throw new NamedSchemaError(result.issues, data, schemaName, bqMeta)
  }
  return result.value
}
