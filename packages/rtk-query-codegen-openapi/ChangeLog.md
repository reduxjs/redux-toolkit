# Changelog

All notable changes to the `RTK Query - Code Generator` for `Open API` project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.3] - 10-11-2023

### Added
- Support for Read Only Properties in the Open API spec. Previously, this property was ignored.   
 Now if the readOnly property is present and set to `true` in a schema, it will split the type into two types: one with the read only property suffixed as 'Read' and the other without the read only properties, using the same type name as before.
This may cause issues if you had your OpenAPI spec properly typed/configured, as it will remove the read onyl types from your existing type. You will need to switch to the new type suffixed as 'Read' to avoid missing property names.

### Changed
- 

### Deprecated
- 

### Removed
- OAZapFTS was removed as a workaround while it is getting fixed.

### Fixed
-

### Security
- 
