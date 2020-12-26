<p align="center">
  <img src="https://raw.githubusercontent.com/rtk-incubator/rtk-query/main/logo.png" width="400" />
</p>
<h2 align="center">
Code Generator
</h2>

<p align="center">
   <a href="https://discord.gg/0ZcbPKXt5bZ6au5t" target="_blank">
    <img src="https://img.shields.io/badge/chat-online-green" alt="Discord server" />
  </a>
</p>

### Introduction

This is a utility library meant to be used with [RTK Query](https://rtk-query-docs.netlify.app) that will generate a typed API client from an OpenAPI schema.

### Usage

```bash
curl -o petstore.json https://petstore3.swagger.io/api/v3/openapi.json
npx @rtk-incubator/rtk-query-codegen-openapi petstore.json > petstore-api.generated.ts
```

### CLI Options

- `--exportName <name>` - change the name of the exported api (default: `api`)
- `--reducerPath <path>` - change the name of the `reducerPath` (default: `api`)
- `--baseQuery <name>` - change the name of `baseQuery` (default: `fetchBaseQuery`)
- `--argSuffix <name>` - change the suffix of the args (default: `ApiArg`)
- `--responseSuffix <name>` - change the suffix of the args (default: `ApiResponse`)
- `--baseUrl <url>` - set the `baseUrl`

### Documentation

[View the RTK Query Code Generation docs](https://rtk-query-docs.netlify.app/concepts/codegen)
