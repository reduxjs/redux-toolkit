# Changelog

All notable changes to the `RTK Query - Code Generator` for `Open API` project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 2.1.0 - 2025-10-08

### Added

- Add `useUnknown` config option to openapi codegen ([#4999](https://github.com/reduxjs/redux-toolkit/pull/4999))
- Add cli to exports ([#4977](https://github.com/reduxjs/redux-toolkit/pull/4977))
- JSDoc generation improvements ([#5032](https://github.com/reduxjs/redux-toolkit/pull/5032))

### Fixed

- Fix incorrect handling of query parameters with values 0 or empty strings in CodeGeneration output ([#4782](https://github.com/reduxjs/redux-toolkit/pull/4782))
- Fix React-Native package exports ([#4887](https://github.com/reduxjs/redux-toolkit/pull/4887))

### Changed

- Update `@apidevtools/swagger-parser` to version 10.1.1 ([#4919](https://github.com/reduxjs/redux-toolkit/pull/4919))
- Update TypeScript version to 5.8

## 1.2.0 - 2023-11-09

This version adds a new `mergeReadWriteOnly` configuration option (default to `false`) that, when set to `true` will not generate separate types for read-only and write-only properties.

## 1.1.3 - 2023-10-11

### Added

- Adds a temporary workaround for [4.9.0 and 4.10.0 generate circular types oazapfts/oazapfts#491](https://github.com/oazapfts/oazapfts/issues/491)

## 1.1.2 - 2023-10-11

### Added

- Support for Read Only Properties in the Open API spec. Previously, this property was ignored.
  - Now if the readOnly property is present and set to `true` in a schema, it will split the type into two types: one with the read only property suffixed as 'Read' and the other without the read only properties, using the same type name as before.
  - This may cause issues if you had your OpenAPI spec properly typed/configured, as it will remove the read onyl types from your existing type. You will need to switch to the new type suffixed as 'Read' to avoid missing property names.

## 1.1.1 - 2023-10-11

### Changed

- Codegen: better handling of duplicate param names ([Codegen: better handling of duplicate param names #3780](https://github.com/reduxjs/redux-toolkit/pull/3780))
  - If a parameter name is both used in a query and a parameter, it will be prefixed with `query`/`param` now to avoid conflicts

## 1.1.0 - 2023-10-11

### Added

- Option of generating real TS enums instead of string unions [Adds the option of generating real TS enums instead of string unions #2854](https://github.com/reduxjs/redux-toolkit/pull/2854)
- Compatibility with TypeScript 5.x versions as the codegen relies on the TypeScript AST for code generation
  - As a result also needs a higher TypeScript version to work with (old version range was 4.1-4.5)
- Changes depenendcy from a temporarily patched old version of `oazapfts` back to the current upstream version
