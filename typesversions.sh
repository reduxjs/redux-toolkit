#!/usr/bin/env bash
shopt -s extglob

mkdir -p dist/min-4.1
cp -r dist/!(min-4.1) dist/min-4.1
find dist/min-4.1 -type f -not -name "*.d.ts" -delete

cat >dist/ts41Types.d.ts <<EOF
import { EndpointDefinitions } from './endpointDefinitions';
export declare type TS41Hooks<Definitions extends EndpointDefinitions> = unknown;
export {};
EOF
