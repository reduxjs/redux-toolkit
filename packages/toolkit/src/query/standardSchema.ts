import type { StandardSchemaV1 } from '@standard-schema/spec'
import { SchemaError } from '@standard-schema/utils'

export async function parseWithSchema<Schema extends StandardSchemaV1>(
  schema: Schema,
  data: unknown,
): Promise<StandardSchemaV1.InferOutput<Schema>> {
  let result = schema['~standard'].validate(data)
  if (result instanceof Promise) result = await result
  if (result.issues) throw new SchemaError(result.issues)
  return result.value
}
