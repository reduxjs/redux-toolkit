# TypeScript Config

A collection of different TypeScript configurations tailored for Redux projects.

## Installation

#### NPM

```bash
npm install --save-dev @reduxjs/tsconfig
```

#### Yarn

```bash
yarn add --dev @reduxjs/tsconfig
```

#### PNPM

```bash
pnpm add --save-dev @reduxjs/tsconfig
```

#### Bun

```bash
bun add --dev @reduxjs/tsconfig
```

## Usage

**Inside a file like `tsconfig.json`**:

```json
{
  "extends": "@reduxjs/tsconfig/base",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```
