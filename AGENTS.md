# Repository Guidelines

## Project Structure & Module Organization
`scripts/` contains the Node.js 20+ ESM CLI entry points: `generate-feed.js` fetches and scores items, `prepare-digest.js` assembles LLM-ready input, and `deliver.js` sends or prints the final digest. `config/` stores source definitions and the user-config schema. `prompts/` holds prompt fragments that shape the digest. `examples/` includes sample output. Root-level `feed-*.json`, `state-feed.json`, and `source-validation-report.json` are generated artifacts; `.github/workflows/` automates scheduled refreshes.

## Build, Test, and Development Commands
- `cd scripts && npm install` — install script dependencies.
- `cd scripts && npm run generate-feed` — refresh local feed JSON files.
- `cd scripts && npm run generate-feed:report` — refresh feeds and write `source-validation-report.json`.
- `cd scripts && npm run validate-sources` — validate source definitions without a normal content run.
- `cd scripts && npm run prepare-digest` — build the digest input bundle from current feeds and prompts.
- `cd scripts && node deliver.js --file ../examples/sample-digest.md` — smoke-test delivery with a sample digest.

## Coding Style & Naming Conventions
Match the existing JavaScript style: 2-space indentation, semicolons, single quotes, and ESM `import`/`export` syntax. Use `camelCase` for functions and variables, `SCREAMING_SNAKE_CASE` for top-level constants, and `kebab-case` for filenames. Keep JSON formatted with 2-space indentation. Prefer small, focused helpers over deeply nested logic, especially in scraping and scoring code.

## Testing Guidelines
There is no dedicated unit-test suite yet. Use `npm run validate-sources` as the baseline regression check after changing `config/default-sources.json` or scraping logic in `scripts/generate-feed.js`. Run `npm run prepare-digest` after prompt or selection changes to confirm the assembled payload still looks correct. If you change generated feeds, regenerate them instead of editing them by hand.

## Commit & Pull Request Guidelines
This checkout does not include local Git history, so follow Conventional Commits. The automation already uses `chore: update feeds [skip ci]`; keep generated-feed updates in their own commit when possible. PRs should summarize the changed sources, prompts, or delivery behavior, list the commands you ran, and include a sample digest snippet or screenshot when output formatting changes.

## Security & Configuration Tips
Never commit secrets from `~/.ustc-dailynews/.env` or personal config from `~/.ustc-dailynews/config.json`. Validate regex and scraper changes carefully in `config/default-sources.json`, because small pattern mistakes can silently drop items or admit noise.
