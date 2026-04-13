---
name: ustc-daily-news
description: Prepare and deliver USTC Daily News digests for USTC official updates, selected departments, jobs, and tech or research highlights. Use when the user asks for a USTC digest, campus roundup, department notices, digest configuration, or delivery setup.
metadata:
  { "openclaw": { "emoji": "📰", "requires": { "bins": ["node", "openclaw"] } } }
---

# USTC Daily News

Use the installed runtime at `${HOME}/.openclaw/ustc-daily-news/bin/ustc-daily-news`.

## When to use

Use this skill when the user asks for any of:

- today's or this week's USTC digest
- USTC official updates or department notices
- campus jobs or recruitment notices in the digest
- changing digest language, department selection, schedule, or delivery target
- checking whether the USTC digest installation is working

## Core commands

```bash
${HOME}/.openclaw/ustc-daily-news/bin/ustc-daily-news prepare-digest
${HOME}/.openclaw/ustc-daily-news/bin/ustc-daily-news generate-feed
${HOME}/.openclaw/ustc-daily-news/bin/ustc-daily-news validate-sources
${HOME}/.openclaw/ustc-daily-news/bin/ustc-daily-news deliver --file /absolute/path/to/digest.md
```

## Workflow

1. Read `~/.openclaw/ustc-daily-news/config.json` when the user wants to inspect or change preferences.
2. For digest generation, always start with `prepare-digest`.
3. Treat the JSON output from `prepare-digest` as the source of truth for items, links, and selected departments.
4. If `errors` is present but the JSON still contains usable items, continue with the available content and mention the partial failure briefly.
5. Only use URLs already present in the prepared JSON unless the user explicitly asks for extra research.

## Delivery and setup

- Config file: `~/.openclaw/ustc-daily-news/config.json`
- Secrets file: `~/.openclaw/ustc-daily-news/.env`
- Runtime command: `~/.openclaw/ustc-daily-news/bin/ustc-daily-news`

If the user asks whether the OpenClaw integration is installed correctly, check both:

```bash
openclaw skills info ustc-daily-news
${HOME}/.openclaw/ustc-daily-news/bin/ustc-daily-news help
```
