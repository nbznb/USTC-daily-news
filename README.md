# USTC Daily News

An AI-powered digest project that tracks USTC official updates, department notices, campus job information, and selected technology or research highlights, then turns them into concise summaries.

## What You Get

A daily or weekly digest with:

- USTC official news and notices
- Selected department updates from chosen schools
- Campus job and recruitment information
- Selected technology and research updates from public feeds
- Links to all original sources
- English, Chinese, or bilingual output

## Architecture

- `config/default-sources.json` defines all tracked sources, including department sites and the job center
- `config/config-schema.json` defines user config, including `selectedDepartments`
- `scripts/generate-feed.js` fetches sources, scores candidates, writes feeds, and can emit a validation report
- `scripts/prepare-digest.js` loads feeds, filters department items by config, and bundles prompts for the LLM; technology and research items are both routed through `tech`
- `scripts/deliver.js` delivers the final digest to stdout, Telegram, or email
- `prompts/` controls summary style and section order, including the unified summary style for items inside `tech`
- `.github/workflows/generate-feed.yml` refreshes feeds on schedule

## Department Selection

Configure selected departments in `~/.ustc-dailynews/config.json`:

```json
{
  "selectedDepartments": ["少年班学院"]
}
```

- The default selection is one department: `少年班学院`
- You can add multiple department names manually
- Only selected departments are passed into digest generation

## Validation

Run source validation and generate a report:

```bash
cd scripts && npm run validate-sources
```

The command writes `source-validation-report.json` in the project root.

## Release Packaging

Create a clean release folder with only the core project files:

```bash
cd scripts && npm run package-release -- --name v1.0.0
```

The command creates `versions/<name>/` in the project root and excludes `.git`, `scripts/node_modules`, generated feeds, `state-feed.json`, `source-validation-report.json`, and common temporary files.

## OpenClaw Installation

1. Clone this repository into your OpenClaw workspace.
2. Run `./install.sh` to install `scripts/` dependencies and create a default `~/.ustc-dailynews/config.json`.
3. Review `~/.ustc-dailynews/config.json` and adjust `language`, `frequency`, `selectedDepartments`, and delivery settings as needed.
4. If you want Telegram or email delivery, add the required secrets to `~/.ustc-dailynews/.env`.
5. Run `cd scripts && npm run prepare-digest`. Each run now attempts a fresh local `generate-feed` refresh first, then falls back to cached local files or GitHub snapshots if refresh fails.

Example config:

```json
{
  "platform": "openclaw",
  "language": "zh",
  "frequency": "daily",
  "selectedDepartments": ["少年班学院"]
}
```

## Requirements

- Node.js 20+
- Internet connection for source fetching and delivery APIs

## License

MIT
