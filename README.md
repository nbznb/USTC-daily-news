[**English**](README.md) | [中文](README.zh-CN.md)

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

Configure selected departments in `~/.openclaw/ustc-daily-news/config.json`:

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

1. Run `./install.sh`.
2. The installer copies the runtime into `~/.openclaw/ustc-daily-news/app`, installs the OpenClaw skill into `~/.openclaw/skills/ustc-daily-news`, creates `~/.openclaw/ustc-daily-news/config.json`, and installs the command `~/.openclaw/ustc-daily-news/bin/ustc-daily-news`.
3. Verify OpenClaw can see the skill with `openclaw skills info ustc-daily-news`.
4. Review `~/.openclaw/ustc-daily-news/config.json` and adjust `language`, `frequency`, `selectedDepartments`, and delivery settings as needed.
5. If you want Telegram or email delivery, add the required secrets to `~/.openclaw/ustc-daily-news/.env`.
6. Run `~/.openclaw/ustc-daily-news/bin/ustc-daily-news prepare-digest`. Each run attempts a fresh local `generate-feed` refresh first, then falls back to cached local files or GitHub snapshots if refresh fails.

## Full Bash Setup

Minimal end-to-end setup with in-chat / stdout delivery:

```bash
./install.sh

cat > ~/.openclaw/ustc-daily-news/config.json <<'EOF'
{
  "platform": "openclaw",
  "language": "zh",
  "timezone": "Asia/Shanghai",
  "frequency": "daily",
  "deliveryTime": "08:00",
  "selectedDepartments": ["少年班学院"],
  "delivery": {
    "method": "stdout"
  },
  "onboardingComplete": true
}
EOF

: > ~/.openclaw/ustc-daily-news/.env

openclaw skills info ustc-daily-news
~/.openclaw/ustc-daily-news/bin/ustc-daily-news help
~/.openclaw/ustc-daily-news/bin/ustc-daily-news prepare-digest
```

If you want Telegram or email delivery, replace the config and `.env` with your own values:

```bash
cat > ~/.openclaw/ustc-daily-news/config.json <<'EOF'
{
  "platform": "openclaw",
  "language": "bilingual",
  "timezone": "Asia/Shanghai",
  "frequency": "weekly",
  "weeklyDay": "friday",
  "deliveryTime": "09:30",
  "selectedDepartments": ["少年班学院", "计算机科学与技术学院"],
  "delivery": {
    "method": "telegram",
    "chatId": "YOUR_TELEGRAM_CHAT_ID"
  },
  "onboardingComplete": true
}
EOF

cat > ~/.openclaw/ustc-daily-news/.env <<'EOF'
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
  "selectedDepartments": ["少年班学院"]
}
```

## Requirements

- OpenClaw CLI
- Node.js 20+
- Internet connection for source fetching and delivery APIs

## License

MIT
