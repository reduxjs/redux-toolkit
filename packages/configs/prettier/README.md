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
import { prettierConfig } from '@reduxjs/prettier-config'

export default prettierConfig
```

**CommonJS (CJS) usage inside a file like `prettier.config.cjs` (using `require`)**:

```js
const { prettierConfig } = require('@reduxjs/prettier-config')

module.exports = prettierConfig
```

**CommonJS (CJS) usage inside a file like `prettier.config.cjs` (using dynamic import)**:

```js
module.exports = (async () =>
  (await import('@reduxjs/prettier-config')).prettierConfig)()
```

To avoid having to write JSDocs we also provide a `createPrettierConfig` function. This function already includes the default `prettierConfig` and you can pass in additional overrides as an argument.

**ECMAScript Modules (ESM) usage inside a file like `prettier.config.mjs`**:

```js
import { createPrettierConfig } from '@reduxjs/prettier-config'

export default createPrettierConfig({
  arrowParens: 'avoid',
  // ...Other additional overrides
})
```

**CommonJS (CJS) usage inside a file like `prettier.config.cjs` (using `require`)**:

```js
const { createPrettierConfig } = require('@reduxjs/prettier-config')

module.exports = createPrettierConfig({
  arrowParens: 'avoid',
  // ...Other additional overrides
})
```

**CommonJS (CJS) usage inside a file like `prettier.config.cjs` (using dynamic import)**:

```js
module.exports = (async () =>
  (await import('@reduxjs/prettier-config')).createPrettierConfig({
    arrowParens: 'avoid',
    // ...Other additional overrides
  }))()
```
