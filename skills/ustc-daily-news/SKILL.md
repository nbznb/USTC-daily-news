---
name: ustc-daily-news
description: Prepare and deliver USTC Daily News digests for USTC official updates, selected departments, jobs, and tech highlights. Use when the user asks for a USTC digest, campus roundup, department notices, digest configuration, or delivery setup.
metadata:
  { "openclaw": { "emoji": "📰", "requires": { "bins": ["node", "openclaw"] } } }
---

# USTC Daily News

Use the installed skill directory at `${HOME}/.openclaw/skills/ustc-daily-news`.

This skill helps USTC students prepare useful digests from official updates, selected department notices, campus jobs, and tech highlights.

## Agent Execution

- Handle normal USTC Daily News work in the current primary agent by default.
- Do not delegate routine digest generation, config inspection, onboarding, delivery setup, delivery checks, or installation checks to a subagent.
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
cd ${HOME}/.openclaw/skills/ustc-daily-news/scripts && node prepare-digest.js
cd ${HOME}/.openclaw/skills/ustc-daily-news/scripts && node generate-feed.js
cd ${HOME}/.openclaw/skills/ustc-daily-news/scripts && node generate-feed.js --validate --report ../source-validation-report.json
cd ${HOME}/.openclaw/skills/ustc-daily-news/scripts && node deliver.js --file /absolute/path/to/digest.md
```

## Workflow

1. If `~/.openclaw/skills/ustc-daily-news/config.json` is missing or `onboardingComplete !== true`, complete onboarding before normal digest work.
2. For digest generation, always start with `prepare-digest`.
3. Treat the JSON output from `prepare-digest` as the source of truth for config, items, links, prompts, and selected departments.
4. Use only URLs already present in the prepared JSON unless the user explicitly asks for extra research.
5. If `errors` is present but the JSON still contains usable items, continue with the available content and mention the partial failure briefly.
6. Keep the final digest in the standard order: official, departments, jobs, then tech news. Skip empty sections and keep each section concise.

## Digest Rules

- Optimize for student usefulness, time sensitivity, and actionability rather than institutional completeness.
- Prefer activities, lectures, seminars, academic reports, deadlines, application windows, scholarships, course or exam changes, jobs, recruiting sessions, venues, and signup paths.
- Downweight political study sessions, ceremonial visits, leadership statements, and low-signal publicity unless they clearly affect students or require action.
- Do not invent extra sections, dates, speakers, requirements, paper details, or conclusions not present in the prepared JSON.
- Surface deadlines, speaker names, topics, locations, eligibility, and registration requirements before background context when available.

## First-Run Onboarding

Keep onboarding brief. Confirm these fields before marking onboarding complete:

- `language`, recommended default `zh`
- `frequency`, recommended default `daily`
- `timezone`, recommended default `Asia/Shanghai`
- `deliveryTime`, recommended default `08:00`
- `weeklyDay`, only when `frequency` is `weekly`
- `delivery.method`, recommended default `stdout`
- `selectedDepartments`, required

Department selection rules:

- Prefer department names from `departmentSelection.available` in `prepare-digest` output.
- If that list is unavailable, fall back to department names in `config/default-sources.json`.
- Accept exact matches, clear short forms, aliases, or high-confidence fuzzy matches.
- Ask only when the input cannot be matched reliably or when multiple candidates are plausible.
- If `selectedDepartments` is empty or omitted, treat it as "follow no departments" rather than "follow all departments".
- Always write formal department names into `selectedDepartments`.

Config writeback rules:

- Write `~/.openclaw/skills/ustc-daily-news/config.json` when onboarding finishes.
- Keep `platform: "openclaw"` and set `onboardingComplete: true`.
- Preserve `allowDuplicatePush` unless the user asked to change it.
- Write `weeklyDay` only when `frequency` is `weekly`.
- Write only the delivery-specific fields required by the selected method.

## Delivery And Setup

- Config file: `~/.openclaw/skills/ustc-daily-news/config.json`
- Secrets file: `~/.openclaw/skills/ustc-daily-news/.env`
- Runtime path: `~/.openclaw/skills/ustc-daily-news`
- `stdout`: no secrets required
- `telegram`: requires `TELEGRAM_BOT_TOKEN` in the secrets file and `delivery.chatId` in config
- `email`: requires `RESEND_API_KEY` in the secrets file and `delivery.email` in config

If the user asks whether the OpenClaw integration is installed correctly, check both:

```bash
openclaw skills info ustc-daily-news
cd ${HOME}/.openclaw/skills/ustc-daily-news/scripts && node prepare-digest.js
```
