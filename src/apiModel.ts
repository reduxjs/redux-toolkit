import * as ts from "typescript";
import * as tsMorph from "ts-morph";

type EntityType = string | { entityType: string; id?: string | number };
type TypeName = ts.Identifier | string;
type DeclareFunction = tsMorph.WriterFunction;

export type EndpointDefinition = {
  type: "query" | "mutation";
  name: string;
  query: DeclareFunction;
  QueryArgType: TypeName;
  ResultType: TypeName;
  generationDisabled?: boolean;
} & (
  | {
      type: "query";
      provides?: EntityType[];
    }
  | {
      type: "mutation";
      invalidates?: EntityType[];
    }
);
