# ESLint Config

ESLint configuration tailored for Redux projects.

## Installation

#### NPM

```bash
npm install --save-dev @reduxjs/eslint-config
```

#### Yarn

```bash
yarn add --dev @reduxjs/eslint-config
```

#### PNPM

```bash
pnpm add --save-dev @reduxjs/eslint-config
```

#### Bun

```bash
bun add --dev @reduxjs/eslint-config
```

## Usage

**ECMAScript Modules (ESM) usage inside a file like `eslint.config.mts` or `eslint.config.mjs`**:

```ts
import { reduxESLintConfig } from '@reduxjs/eslint-config'

export default reduxESLintConfig
```

**CommonJS (CJS) usage inside a file like `eslint.config.cts` or `eslint.config.cjs` (using `require`)**:

```ts
const { reduxESLintConfig } = require('@reduxjs/eslint-config')

module.exports = reduxESLintConfig
```

**CommonJS (CJS) usage inside a file like `eslint.config.cjs` or `eslint.config.cts` (using dynamic import)**:

```ts
module.exports = (async () =>
  (await import('@reduxjs/eslint-config')).reduxESLintConfig)()
```

**CommonJS (CJS) usage inside a file like `eslint.config.cts` (using import and export assignment)**:

```ts
import ReduxESLintConfig = require('@reduxjs/eslint-config')
import reduxESLintConfig = ReduxESLintConfig.reduxESLintConfig

export = reduxESLintConfig
```

Navigating ESLint's configuration options can occasionally feel overwhelming, especially when trying to take advantage of TypeScript's strong typing for better IntelliSense support. To alleviate this complexity and enhance your development experience, we also provide a function called `createESLintConfig` that you can import and use to create your own ESLint configuration. This function already includes the default `reduxESLintConfig` and you can pass in an array of flat configs as additional overrides.

**ECMAScript Modules (ESM) usage inside a file like `eslint.config.mts` or `eslint.config.mjs`**:

```ts
import { createESLintConfig } from '@reduxjs/eslint-config'

export default createESLintConfig([
  {
    rules: {
      'no-console': [0],
    },
  },
  {
    // ...Other additional overrides
  },
])
```

**CommonJS (CJS) usage inside a file like `eslint.config.cts` or `eslint.config.cjs` (using `require`)**:

```ts
const { createESLintConfig } = require('@reduxjs/eslint-config')

module.exports = createESLintConfig([
  {
    rules: {
      'no-console': [0],
    },
  },
  {
    // ...Other additional overrides
  },
])
```

**CommonJS (CJS) usage inside a file like `eslint.config.cts` or `eslint.config.cjs` (using dynamic import)**:

```ts
module.exports = (async () =>
  (await import('@reduxjs/eslint-config')).createESLintConfig([
    {
      rules: {
        'no-console': [0],
      },
    },
    {
      // ...Other additional overrides
    },
  ]))()
```

**CommonJS (CJS) usage inside a file like `eslint.config.cts` (using import and export assignment)**:

```ts
import ReduxESLintConfig = require('@reduxjs/eslint-config')
import createESLintConfig = ReduxESLintConfig.createESLintConfig

export = createESLintConfig([
  {
    rules: {
      'no-console': [0],
    },
  },
  {
    // ...Other additional overrides
  },
])
```
