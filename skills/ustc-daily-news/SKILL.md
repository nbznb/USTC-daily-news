---
name: ustc-daily-news
description: Prepare and deliver USTC Daily News digests for USTC official updates, selected departments, jobs, and tech highlights. Use when the user asks for a USTC digest, campus roundup, department notices, digest configuration, or delivery setup.
metadata:
  { "openclaw": { "emoji": "📰", "requires": { "bins": ["node", "openclaw"] } } }
---

# USTC Daily News

Use the installed runtime at `${HOME}/.openclaw/ustc-daily-news/bin/ustc-daily-news`.

This direct version prepares useful digests from official updates, selected department notices, campus jobs, and tech highlights with a split workflow:

- `tech` comes from prepared RSS items
- USTC official, department, and job content comes from HTML entry pages that you must visit yourself

## Agent Execution

- Handle normal USTC Daily News work in the current primary agent by default.
- Do not delegate routine digest generation, config inspection, delivery setup, delivery checks, or installation checks to a subagent.
- Consider a subagent only when the user explicitly asks for multi-agent/delegated work, or when a separate parallel investigation is clearly necessary.

## When To Use

Use this skill when the user asks for:

- today's or this week's USTC digest
- USTC official updates, department notices, or campus jobs
- tech highlights in the digest
- digest language, schedule, department, or delivery configuration
- an OpenClaw installation or delivery check for this digest

## Core Commands

```bash
${HOME}/.openclaw/ustc-daily-news/bin/ustc-daily-news prepare-digest
${HOME}/.openclaw/ustc-daily-news/bin/ustc-daily-news generate-feed
${HOME}/.openclaw/ustc-daily-news/bin/ustc-daily-news validate-sources
${HOME}/.openclaw/ustc-daily-news/bin/ustc-daily-news deliver --file /absolute/path/to/digest.md
```

## Workflow

1. If `~/.openclaw/ustc-daily-news/config.json` is missing, ask the user to run `./install.sh` or create a minimal config with defaults before normal digest work.
2. For digest generation, always start with `prepare-digest`.
3. Treat the JSON output from `prepare-digest` as the source of truth for config, tech items, HTML source entry pages, prompts, and selected departments.
4. For `officialHtmlSources`, `departmentHtmlSources`, and `jobHtmlSources`, visit those HTML entry pages yourself before choosing digest items.
5. For `tech`, use only the provided RSS items unless the user explicitly asks for extra research.
6. If `errors` is present but the JSON still contains usable items or HTML sources, continue with the available content and mention the partial failure briefly.
7. Keep the final digest in the standard order: official, departments, jobs, then tech news. Skip empty sections and keep each section concise.

## Digest Rules

- Optimize for student usefulness, time sensitivity, and actionability rather than institutional completeness.
- Prefer activities, lectures, seminars, academic reports, deadlines, application windows, scholarships, course or exam changes, jobs, recruiting sessions, venues, and signup paths.
- Downweight political study sessions, ceremonial visits, leadership statements, and low-signal publicity unless they clearly affect students or require action.
- Do not invent extra sections, dates, speakers, requirements, paper details, or conclusions not present in the prepared JSON or the pages you open from the provided HTML sources.
- Surface deadlines, speaker names, topics, locations, eligibility, and registration requirements before background context when available.

## Config Defaults

The installer should leave the user with a usable config by default:

- `language`: `zh`
- `frequency`: `daily`
- `timezone`: `Asia/Shanghai`
- `deliveryTime`: `08:00`
- `delivery.method`: `stdout`
- `selectedDepartments`: default to `[]` until the user changes it
- `onboardingComplete`: `true`

Department selection rules:

- Prefer department names from `departmentSelection.available` in `prepare-digest` output.
- If that list is unavailable, fall back to department names in `config/default-sources.json`.
- Accept exact matches, clear short forms, aliases, or high-confidence fuzzy matches.
- If `selectedDepartments` is empty or omitted, treat it as "follow no departments" rather than "follow all departments".
- Always write formal department names into `selectedDepartments`.

Config writeback rules:

- Write `~/.openclaw/ustc-daily-news/config.json` when the user asks to change preferences.
- Keep `platform: "openclaw"` and `onboardingComplete: true`.
- Preserve `allowDuplicatePush` unless the user asked to change it.
- Write `weeklyDay` only when `frequency` is `weekly`.
- Write only the delivery-specific fields required by the selected method.

## Delivery And Setup

- Config file: `~/.openclaw/ustc-daily-news/config.json`
- Secrets file: `~/.openclaw/ustc-daily-news/.env`
- Runtime command: `~/.openclaw/ustc-daily-news/bin/ustc-daily-news`
- `stdout`: no secrets required
- `telegram`: requires `TELEGRAM_BOT_TOKEN` in the secrets file and `delivery.chatId` in config
- `email`: requires `RESEND_API_KEY` in the secrets file and `delivery.email` in config

If the user asks whether the OpenClaw integration is installed correctly, check both:

```bash
openclaw skills info ustc-daily-news
${HOME}/.openclaw/ustc-daily-news/bin/ustc-daily-news help
```
