[**English**](README.md) | [中文](README.zh-CN.md)

# USTC Daily News Direct

An AI-assisted digest project that splits data preparation into two clear paths:

- technology news is fetched from RSS or Atom feeds by JavaScript
- USTC official, department, and job content is exposed as HTML entry pages that the agent or LLM visits directly

## What You Get

A daily or weekly digest with:

- USTC official news and notices
- Selected department updates from chosen schools
- Campus job and recruitment information
- Selected technology updates from public feeds
- Links to all original sources
- English, Chinese, or bilingual output

## Architecture

- `config/default-sources.json` defines two source modes: `html` entry pages for USTC content and RSS feeds for `tech`
- `config/config-schema.json` defines user config, including `selectedDepartments` and `allowDuplicatePush`
- `scripts/generate-feed.js` only fetches and writes the `tech` RSS feed
- `scripts/prepare-digest.js` bundles pre-fetched `tech` items plus `officialHtmlSources`, `departmentHtmlSources`, and `jobHtmlSources` for the agent or LLM
- `scripts/deliver.js` delivers the final digest to stdout, Telegram, or email
- `prompts/` explains that USTC HTML sources must be visited by the agent or LLM, while `tech` must stay within the prepared RSS items

## Department Selection

Configure selected departments in `~/.openclaw/ustc-daily-news/config.json`:

```json
{
  "selectedDepartments": [],
  "allowDuplicatePush": true
}
```

- The installer leaves `selectedDepartments` empty by default
- Users can update `selectedDepartments` manually later if they want department updates
- If `selectedDepartments` is empty or omitted, `prepare-digest` outputs no department HTML sources
- You can add multiple formal department names manually
- Only selected departments are passed into digest generation
- If you explicitly set `selectedDepartments` but none match, the departments section becomes empty and `errors` reports the mismatch

## Duplicate Push Control

Configure duplicate behavior in `~/.openclaw/ustc-daily-news/config.json`:

```json
{
  "allowDuplicatePush": true
}
```

- `true` (default): repeated tech items are allowed across runs
- `false`: repeated tech items are filtered with `state-feed.json`
- USTC HTML entry pages are not deduped in JavaScript

## Prepared JSON Shape

`prepare-digest` returns:

- `tech`: the prepared tech RSS items
- `officialHtmlSources`: HTML entry pages for USTC official content
- `departmentHtmlSources`: filtered HTML entry pages for selected departments
- `jobHtmlSources`: HTML entry pages for jobs and recruitment
- `official`, `departments`, `jobs`: kept as empty arrays for compatibility with older callers

The agent or LLM must open the HTML sources itself to select and summarize USTC items.

## Validation

```bash
cd scripts && npm run validate-sources
```

This version keeps the command for compatibility, but it only validates the `tech` RSS fetch path and report generation. It does not validate USTC HTML pages.

## Release Packaging

Create a clean release folder with only the core project files:

```bash
cd scripts && npm run package-release -- --name v1.0.0
```

The command creates `versions/<name>/` in the project root and excludes `.git`, `scripts/node_modules`, generated feeds, `source-validation-report.json`, and common temporary files.

## OpenClaw Installation

1. Run `./install.sh`.
2. The installer copies the runtime into `~/.openclaw/ustc-daily-news/app`, installs the OpenClaw skill into `~/.openclaw/skills/ustc-daily-news`, creates `~/.openclaw/ustc-daily-news/config.json`, and installs the command `~/.openclaw/ustc-daily-news/bin/ustc-daily-news`.
3. Verify OpenClaw can see the skill with `openclaw skills info ustc-daily-news`.
4. The installer writes a ready-to-use default config. If you want department updates in the digest, edit `~/.openclaw/ustc-daily-news/config.json` and fill in `selectedDepartments`.
5. If you want Telegram or email delivery, add the required secrets to `~/.openclaw/ustc-daily-news/.env`.
6. Run `~/.openclaw/ustc-daily-news/bin/ustc-daily-news prepare-digest`. Each run attempts a fresh local `tech` RSS refresh first, then falls back to cached or remote `tech` feed data if needed. USTC content is passed through as HTML entry sources for the agent or LLM.

## Requirements

- OpenClaw CLI
- Node.js 20+
- Internet connection for source fetching and delivery APIs

## License

MIT
