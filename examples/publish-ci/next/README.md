# Redux Toolkit + Next.js App Router CI example

This is a CI fixture, not a starter template. It exists so that RTK's
`test-published-artifact` job can install a freshly packed `@reduxjs/toolkit`
tarball into a real Next.js app, build it, and run a Playwright test against it.

## What it covers

- Next 16 with the **App Router** and Turbopack, on React 19.
- The client half of the app resolves RTK through Next's bundler, which picks
  the `module-sync` / `module` condition and lands on
  `dist/redux-toolkit.modern.mjs`.
- `src/app/ServerApiInfo.tsx` is a **Server Component** that imports the core
  RTK Query entry point (`@reduxjs/toolkit/query`, not `/query/react`) and
  builds a store on the server. This is the only place in the RTK repo that
  exercises RTK inside the React Server Components graph. If RTK ever needs a
  `react-server` export condition, this is where it should show up first.
- `src/app/StoreProvider.tsx` creates the store per client instance with a lazy
  `useState` initializer, matching the pattern in RTK's
  [Next.js setup docs](https://redux-toolkit.js.org/usage/nextjs).

## Layout

| Path                | What it is                                             |
| ------------------- | ------------------------------------------------------ |
| `src/app/`          | App Router entry points and the client/server boundary |
| `src/app-core/`     | Store, typed hooks, and RTK Query API definitions      |
| `src/features/`     | Shared app code, kept in sync with the `vite` example  |
| `src/mocks/`        | MSW handlers and browser worker                        |
| `tests/playwright/` | The single end-to-end test CI runs                     |

## Scripts

```bash
pnpm dev         # next dev
pnpm build       # next build
pnpm type-check  # tsc
pnpm test        # build must have run first; starts the server and runs Playwright
```
