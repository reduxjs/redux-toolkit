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

**ECMAScript Modules (ESM) usage inside a file like `vitest.config.mjs`**:

```js
import { reduxVitestConfig } from '@reduxjs/vitest-config'

export default reduxVitestConfig
```

**CommonJS (CJS) usage inside a file like `vitest.config.cjs`**:

```js
module.exports = (async () =>
  (await import('@reduxjs/vitest-config')).reduxVitestConfig)()
```

To avoid having to write JSDocs we also provide a `createVitestConfig` function. This function already includes the default `reduxVitestConfig` and you can pass in additional overrides as an argument.

**ECMAScript Modules (ESM) usage inside a file like `vitest.config.mjs` or `vitest.config.mts`**:

```ts
import { createVitestConfig } from '@reduxjs/vitest-config'

export default createVitestConfig({
  test: {
    environment: 'jsdom',
    // Other additional overrides
  },
})
```

**CommonJS (CJS) usage inside a file like `vitest.config.cjs` or `vitest.config.cts`**:

```ts
module.exports = (async () =>
  (await import('@reduxjs/vitest-config')).createVitestConfig({
    test: {
      environment: 'jsdom',
      // Other additional overrides
    },
  }))()
```
