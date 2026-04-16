[**English**](README.md) | [中文](README.zh-CN.md)

# USTC Daily News

An AI-powered digest project that tracks USTC official updates, department notices, campus job information, and selected technology highlights, then turns them into concise summaries.

## What You Get

A daily or weekly digest with:

- USTC official news and notices
- Selected department updates from chosen schools
- Campus job and recruitment information
- Selected technology updates from public feeds
- Links to all original sources
- English, Chinese, or bilingual output

## Architecture

- `config/default-sources.json` defines all tracked sources, including department sites and the job center
- `config/config-schema.json` defines user config, including `selectedDepartments` and `allowDuplicatePush`
- `scripts/generate-feed.js` fetches sources, scores candidates, writes feeds, and can emit a validation report
- `scripts/prepare-digest.js` loads feeds, filters department items by config, and bundles prompts for the LLM; technology items are routed through `tech`
- `scripts/deliver.js` delivers the final digest to stdout, Telegram, or email
- `prompts/` controls summary style and section order, including the unified summary style for items inside `tech`
- `.github/workflows/generate-feed.yml` refreshes feeds on schedule

## Department Selection

Configure selected departments in `~/.openclaw/skills/ustc-daily-news/config.json`:

```json
{
  "selectedDepartments": [],
  "allowDuplicatePush": true
}
```

- The installer leaves `selectedDepartments` empty and lets the skill collect the user's department choices during onboarding
- Onboarding matches departments against the currently supported sources and may resolve common short forms or high-confidence fuzzy input such as `少院` -> `少年班学院`
- The skill only interrupts when there is no reliable match or when multiple candidates are plausible
- If `selectedDepartments` is empty or omitted, no department sources are fetched and the departments section stays empty
- You can add multiple formal department names manually
- Only selected departments are passed into digest generation
- If you explicitly set `selectedDepartments` but none match, the departments section becomes empty (no fallback to all departments)

## Duplicate Push Control

Configure duplicate behavior in `~/.openclaw/skills/ustc-daily-news/config.json`:

```json
{
  "allowDuplicatePush": true
}
```

- `true` (default): repeated items are allowed across runs
- `false`: repeated items are filtered with `state-feed.json`

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

The command creates `versions/<name>/` in the project root and excludes `.git`, `scripts/node_modules`, generated feeds, `source-validation-report.json`, and common temporary files.

## OpenClaw Installation

1. Run `./install.sh`.
2. The installer places the full runtime directly in `~/.openclaw/skills/ustc-daily-news`, including `SKILL.md`, `config/`, `prompts/`, `scripts/`, `config.json`, and `.env`.
3. Reinstalls fully replace the skill runtime files, but preserve `config.json` and `.env` by migrating them from either the current skill directory or the legacy `~/.openclaw/ustc-daily-news/` directory.
4. If the legacy `~/.openclaw/ustc-daily-news/` runtime exists, the installer removes it after the new install succeeds.
5. Legacy custom prompt overrides are not migrated; `prompts/` is refreshed from the new release on each install.
6. Verify OpenClaw can see the skill with `openclaw skills info ustc-daily-news`.
7. Review `~/.openclaw/skills/ustc-daily-news/config.json` and set `selectedDepartments` if you want department updates in the digest.
8. If you want Telegram or email delivery, add the required secrets to `~/.openclaw/skills/ustc-daily-news/.env`.
9. Run `cd ~/.openclaw/skills/ustc-daily-news/scripts && node prepare-digest.js`. Each run attempts a fresh local `generate-feed` refresh first, then falls back to cached local files or GitHub snapshots if refresh fails.

## Full Bash Setup

Minimal end-to-end setup with in-chat / stdout delivery:

```bash
./install.sh

cat > ~/.openclaw/skills/ustc-daily-news/config.json <<'EOF'
{
  "platform": "openclaw",
  "language": "zh",
  "timezone": "Asia/Shanghai",
  "frequency": "daily",
  "deliveryTime": "08:00",
  "selectedDepartments": [],
  "allowDuplicatePush": true,
  "delivery": {
    "method": "stdout"
  },
  "onboardingComplete": true
}
EOF

: > ~/.openclaw/skills/ustc-daily-news/.env

openclaw skills info ustc-daily-news
cd ~/.openclaw/skills/ustc-daily-news/scripts && node prepare-digest.js
```

If you want Telegram or email delivery, replace the config and `.env` with your own values:

```bash
cat > ~/.openclaw/skills/ustc-daily-news/config.json <<'EOF'
{
  "platform": "openclaw",
  "language": "bilingual",
  "timezone": "Asia/Shanghai",
  "frequency": "weekly",
  "weeklyDay": "friday",
  "deliveryTime": "09:30",
  "selectedDepartments": ["少年班学院", "计算机科学与技术学院"],
  "allowDuplicatePush": true,
  "delivery": {
    "method": "telegram",
    "chatId": "YOUR_TELEGRAM_CHAT_ID"
  },
  "onboardingComplete": true
}
EOF

cat > ~/.openclaw/skills/ustc-daily-news/.env <<'EOF'
TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
# For email delivery instead, change delivery.method to "email" and use:
# RESEND_API_KEY=YOUR_RESEND_API_KEY
EOF
```

Example config:

```json
{
  "platform": "openclaw",
  "language": "zh",
  "frequency": "daily",
  "selectedDepartments": [],
  "allowDuplicatePush": true
}
```

## Requirements

- OpenClaw CLI
- Node.js 20+
- Internet connection for source fetching and delivery APIs

## License

MIT
