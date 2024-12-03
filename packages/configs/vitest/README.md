# Vitest Config

Vitest configuration tailored for Redux projects.

## Installation

#### NPM

```bash
npm install --save-dev @reduxjs/vitest-config
```

#### Yarn

```bash
yarn add --dev @reduxjs/vitest-config
```

#### PNPM

```bash
pnpm add --save-dev @reduxjs/vitest-config
```

#### Bun

```bash
bun add --dev @reduxjs/vitest-config
```

## Usage

**ECMAScript Modules (ESM) usage inside a file like `vitest.config.mts` or `vitest.config.mjs`**:

```ts
import { reduxVitestConfig } from '@reduxjs/vitest-config'

export default reduxVitestConfig
```

**CommonJS (CJS) usage inside a file like `vitest.config.cts` or `vitest.config.cjs` (using `require`)**:

```ts
const { reduxVitestConfig } = require('@reduxjs/vitest-config')

module.exports = reduxVitestConfig
```

**CommonJS (CJS) usage inside a file like `vitest.config.cts` or `vitest.config.cjs` (using dynamic import)**:

```ts
module.exports = (async () =>
  (await import('@reduxjs/vitest-config')).reduxVitestConfig)()
```

**CommonJS (CJS) usage inside a file like `vitest.config.cts` (using import and export assignment)**:

```ts
import ReduxVitestConfig = require('@reduxjs/vitest-config')
import reduxVitestConfig = ReduxVitestConfig.reduxVitestConfig

export = reduxVitestConfig
```

To avoid having to write JSDocs we also provide a `createVitestConfig` function. This function already includes the default `reduxVitestConfig` and you can pass in additional overrides as an argument.

**ECMAScript Modules (ESM) usage inside a file like `vitest.config.mts` or `vitest.config.mjs`**:

```ts
import { createVitestConfig } from '@reduxjs/vitest-config'

export default createVitestConfig({
  test: {
    environment: 'jsdom',
    // Other additional overrides
  },
})
```

**CommonJS (CJS) usage inside a file like `vitest.config.cts` or `vitest.config.cjs` (using `require`)**:

```ts
const { createVitestConfig } = require('@reduxjs/vitest-config')

module.exports = createVitestConfig({
  test: {
    environment: 'jsdom',
    // Other additional overrides
  },
})
```

**CommonJS (CJS) usage inside a file like `vitest.config.cts` or `vitest.config.cjs` (using dynamic import)**:

```ts
module.exports = (async () =>
  (await import('@reduxjs/vitest-config')).createVitestConfig({
    test: {
      environment: 'jsdom',
      // Other additional overrides
    },
  }))()
```

**CommonJS (CJS) usage inside a file like `vitest.config.cts` (using import and export assignment)**:

```ts
import ReduxVitestConfig = require('@reduxjs/vitest-config')
import createVitestConfig = ReduxVitestConfig.createVitestConfig

export = createVitestConfig({
  test: {
    environment: 'jsdom',
    // Other additional overrides
  },
})
```
