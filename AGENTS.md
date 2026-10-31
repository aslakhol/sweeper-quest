# Agent instructions

## Package manager

This project uses pnpm. Never use npm, npx or yarn, and never create `package-lock.json` or `yarn.lock`.

- Install: `pnpm install`
- Add a dependency: `pnpm add <package>` (`-D` for dev dependencies)
- Run a script: `pnpm <script>`, for example `pnpm check` or `pnpm test:e2e`
- Run a package binary: `pnpm exec <bin>`, for example `pnpm exec playwright install chromium`

`package.json` pins the pnpm version in `packageManager`. Commit `pnpm-lock.yaml` with any dependency change.

See `README.md` for the scripts, code map and game rules.
