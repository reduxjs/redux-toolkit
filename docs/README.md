# Redux Toolkit docs

The pages in this folder are published as part of the combined Redux docs site, at https://redux.js.org/toolkit. The site itself (Docusaurus config, theme, search, redirects, build scripts) lives in the [`reduxjs/redux`](https://github.com/reduxjs/redux) repo under `website/`. This folder holds only the Redux Toolkit pages.

## What lives where

| What                                                                 | Where                                       |
| -------------------------------------------------------------------- | ------------------------------------------- |
| Redux Toolkit pages                                                  | `docs/**/*.{md,mdx}` in this repo           |
| Redux Toolkit sidebar                                                | `docs/sidebars.ts` in this repo             |
| Images used by these pages                                           | `docs/assets/`, referenced by relative path |
| RTK Query internals notes for maintainers (not published)            | `docs/rtk-query/internal/`                  |
| Tutorials, TypeScript setup, style guide, FAQ, troubleshooting       | `docs/` in `reduxjs/redux`                  |
| Site config, navbar, theme, search, redirects (`website/_redirects`) | `website/` in `reduxjs/redux`               |

Topics shared by all the Redux libraries are written once, in the core docs. Link to them instead of repeating them here.

## Links

- Other Redux Toolkit pages: a relative file link (`../api/createSlice.mdx`) or a site path (`/toolkit/api/createSlice`).
- Other libraries and the core docs: site paths, such as `/usage/usage-with-typescript`, `/react-redux/api/hooks`, or `/reselect/api/createSelector`. Do not use full `https://redux.js.org/...` URLs.
- When you rename, move, or delete a page, add a redirect for the old URL to `website/_redirects` in `reduxjs/redux`.

## Sidebar

New pages only appear in the navigation once they are listed in `docs/sidebars.ts`. The file has no imports because the site loads it from a copy of this folder. Its local `SidebarItem` type catches misspelled keys:

```bash
pnpm exec tsc -p docs/tsconfig.json --noEmit
```

The site build checks that every doc id in the sidebar exists.

## Code blocks

TypeScript code blocks in `.mdx` files are type-checked during the site build, and a type error fails the build. They check against the `dist` folder of `packages/toolkit` when it has been built, and against the published `@reduxjs/toolkit` otherwise. Deploy previews build the package first, so a PR's code blocks check against that PR's source.

In the build log, a type error shows up as `Module build failed (from ./plugins/toolkit-types-dependency.cjs)`. That loader only tracks dependencies; the lines after it name the page, the code block, and the TypeScript error.

API pages also pull doc comments from `packages/toolkit/src`, and the `/toolkit/errors` page is built from `errors.json`, so changes to either show up on the site.

## Previewing a PR

Every PR that changes `docs/`, `packages/toolkit/src/`, or `errors.json` gets a Netlify deploy preview of the whole combined site, with this branch's Redux Toolkit docs in place of the published ones.

## Previewing locally

Clone `reduxjs/redux` next to this repo and install the site's dependencies once:

```bash
git clone https://github.com/reduxjs/redux.git ../redux
cd ../redux/docs && pnpm install
cd ../website && pnpm install
```

Then start the dev server from `../redux/website`, pointing it at this checkout:

```bash
DOCS_SOURCE_REDUX_TOOLKIT=../../redux-toolkit pnpm dev
```

`pnpm dev` copies this repo's docs into `website/external/redux-toolkit`, copies each file again when it changes, and runs `docusaurus start`. The other libraries are cloned from GitHub. Set `DOCS_SOURCE_REACT_REDUX` or `DOCS_SOURCE_RESELECT` as well to use local checkouts of those. To type-check code blocks against local source changes, run `pnpm build` in `packages/toolkit` before starting.

The dev server does not report broken links. To run the same checks as a deploy preview:

```bash
DOCS_SOURCE_REDUX_TOOLKIT=../../redux-toolkit pnpm fetch-docs --force
pnpm build
```
