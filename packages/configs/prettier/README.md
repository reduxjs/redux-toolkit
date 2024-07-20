# Prettier Config

Prettier configuration tailored for Redux projects.

## Installation

#### NPM

```bash
npm install --save-dev @reduxjs/prettier-config
```

#### Yarn

```bash
yarn add --dev @reduxjs/prettier-config
```

#### PNPM

```bash
pnpm add --save-dev @reduxjs/prettier-config
```

#### Bun

```bash
bun add --dev @reduxjs/prettier-config
```

## Usage

**ECMAScript Modules (ESM) usage inside a file like `prettier.config.mjs`**:

```js
import { reduxPrettierConfig } from '@reduxjs/prettier-config'

export default reduxPrettierConfig
```

**CommonJS (CJS) usage inside a file like `prettier.config.cjs`**:

```js
module.exports = (async () =>
  (await import('@reduxjs/prettier-config')).reduxPrettierConfig)()
```

To avoid having to write JSDocs we also provide a `createPrettierConfig` function. This function already includes the default `reduxPrettierConfig` and you can pass in additional overrides as an argument.

**ECMAScript Modules (ESM) usage inside a file like `prettier.config.mjs`**:

```js
import { createPrettierConfig } from '@reduxjs/prettier-config'

export default createPrettierConfig({
  arrowParens: 'avoid',
  // ...Other additional overrides
})
```

**CommonJS (CJS) usage inside a file like `prettier.config.cjs`**:

```js
module.exports = (async () =>
  (await import('@reduxjs/prettier-config')).createPrettierConfig({
    arrowParens: 'avoid',
    // ...Other additional overrides
  }))()
```
