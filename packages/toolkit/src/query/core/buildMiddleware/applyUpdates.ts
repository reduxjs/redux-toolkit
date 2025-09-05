import type { EndpointDefinitions } from '../../endpointDefinitions'
import type {
  AllQueryKeys,
  DataFromAnyQueryDefinition,
  QueryArgFromAnyQueryDefinition,
  Recipe,
} from '../buildThunks'

export enum UpdateKind {
  update = 'update',
  upsert = 'upsert',
}

export enum UpdateMode {
  optimistic = 'optimistic',
  pessimistic = 'pessimistic',
}

export interface UpdateDescription<
  Kind extends UpdateKind,
  Mode extends UpdateMode,
  EndpointName extends PropertyKey,
  Arg,
  Result,
> {
  kind: Kind
  mode: Mode
  endpointName: EndpointName
  arg: Arg
  update: Recipe<Result>
}

export type UpdateDescriptions<Mode extends UpdateMode> = ReadonlyArray<
  UpdateDescription<UpdateKind, Mode, any, any, any>
>

export type UpdateDescriptionFactory<
  Definitions extends EndpointDefinitions,
  Kind extends UpdateKind,
  Mode extends UpdateMode,
> = <EndpointName extends AllQueryKeys<Definitions>>(
  endpointName: EndpointName,
  arg: QueryArgFromAnyQueryDefinition<Definitions, EndpointName>,
  update: Recipe<DataFromAnyQueryDefinition<Definitions, EndpointName>>,
) => UpdateDescription<
  Kind,
  Mode,
  EndpointName,
  QueryArgFromAnyQueryDefinition<Definitions, EndpointName>,
  DataFromAnyQueryDefinition<Definitions, EndpointName>
>

export const buildUpdateFactory =
  <Kind extends UpdateKind, Mode extends UpdateMode>(
    kind: Kind,
    mode: Mode,
  ): UpdateDescriptionFactory<any, Kind, Mode> =>
  (endpointName, arg, update) => {
    return {
      kind,
      mode,
      endpointName,
      arg,
      update,
    }
  }
