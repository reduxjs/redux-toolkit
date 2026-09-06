# Node resolution example

Checks that a published `@reduxjs/toolkit` tarball resolves and runs correctly
under plain Node, with no bundler involved.

There are three test modes, one per way Node can load RTK:

| Script             | How RTK is loaded                      | Build it should reach  |
| ------------------ | -------------------------------------- | ---------------------- |
| `test:esm`         | `import` from an ES module             | `*.modern.mjs`         |
| `test:require-esm` | `require()` with require(esm) enabled  | `*.modern.mjs`         |
| `test:require-cjs` | `require()` with require(esm) disabled | `dist/**/cjs/index.js` |

`require(esm)` is on by default from Node 22.12 onward. When it is on, Node adds
the `module-sync` export condition for `require()` calls, so a CommonJS caller
gets the ESM build. `test:require-cjs` passes `--no-experimental-require-module`
to turn that off, which both exercises the real CommonJS build and reproduces
how Node versions older than 22.12 resolve RTK.

Each mode covers all four entry points — `@reduxjs/toolkit`,
`@reduxjs/toolkit/react`, `@reduxjs/toolkit/query`, and
`@reduxjs/toolkit/query/react`. For each one it asserts the resolved file path
and then runs a small behavior check, so a wrong-but-loadable build fails here
rather than passing silently.

`pnpm test` runs all three.
