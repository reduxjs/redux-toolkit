# Node resolution example

Checks that a published `@reduxjs/toolkit` tarball resolves and runs correctly
under plain Node, with no bundler involved.

RTK only ships ES modules. There are two test modes, one per way Node can load
it:

| Script             | How RTK is loaded                     | Build it should reach |
| ------------------ | ------------------------------------- | --------------------- |
| `test:esm`         | `import` from an ES module            | `*.modern.mjs`        |
| `test:require-esm` | `require()` with require(esm) enabled | `*.modern.mjs`        |

`require(esm)` is on by default from Node 20.19 and 22.12 onward, which is the
minimum Node version RTK supports.

CI runs this example on Node 20.19.0, 22.12.0, 24.x and 26.x.

Each mode covers all four entry points — `@reduxjs/toolkit`,
`@reduxjs/toolkit/react`, `@reduxjs/toolkit/query`, and
`@reduxjs/toolkit/query/react`. For each one it asserts the resolved file path
and then runs a small behavior check, so a wrong-but-loadable build fails here
rather than passing silently.

`pnpm test` runs both.
