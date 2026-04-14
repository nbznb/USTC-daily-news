---
name: ustc-daily-news
description: Prepare and deliver USTC Daily News digests for USTC official updates, selected departments, jobs, and tech highlights. Use when the user asks for a USTC digest, campus roundup, department notices, digest configuration, or delivery setup.
metadata:
  { "openclaw": { "emoji": "📰", "requires": { "bins": ["node", "openclaw"] } } }
---

# USTC Daily News

Use the installed runtime at `${HOME}/.openclaw/ustc-daily-news/bin/ustc-daily-news`.

This skill is primarily for USTC students. When selecting or ordering content, optimize for student usefulness, time sensitivity, and actionability rather than institutional completeness.

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

## Editorial Priorities

- Keep the final digest in the standard order: official, departments, jobs, then tech news.
- Skip section headers for modules that have zero usable items.
- Never include more than 6 items in any module.
- Treat each module as a soft target of about 3-6 items when enough good content exists.
- If a module has fewer strong items, allow fewer entries instead of padding with stale or low-value content.
- If a module already has 3 strong items and the remaining candidates are mostly political, ceremonial, or low-signal publicity content, do not pad the section.
- If a module has fewer than 3 strong items and still has usable low-value candidates, fill to 3 using the least noisy low-value items.
- Prefer items with direct student value: activities, lectures, seminars, academic reports, application windows, scholarships, course or exam changes, jobs, recruiting sessions, deadlines, venues, and signup paths.
- When a module is crowded, keep the most actionable, time-sensitive, and information-dense items first.
- General school news can be included, but it ranks below items that help students decide what to attend, apply for, or act on.
- Political study sessions, ceremonial visits, leadership statements, and similar institutional updates are downweighted by default.
- Only keep political or ceremonial items when they clearly affect students, require action, or carry unusually high campus significance.
- If such items are kept, compress them aggressively and place them after student-relevant activities, lectures, and notices.

## Digest Composition Rules

- Use the prepared feeds as-is. If a section is thin, you may allow a small number of recent historical items as filler, while keeping new and time-sensitive items first.
- Do not invent extra sections such as research or papers when the prepared data only contains the 4 standard modules.
- Within each section, surface deadlines, speaker names, topics, locations, eligibility, and registration requirements before background context.
- If several items are similar, prefer the one with the clearest next step or strongest practical value.
- If an item is mostly symbolic, procedural, or political and lacks student-facing consequences, omit it or reduce it to a brief mention.

## Delivery and setup

- Config file: `~/.openclaw/ustc-daily-news/config.json`
- Secrets file: `~/.openclaw/ustc-daily-news/.env`
- Runtime command: `~/.openclaw/ustc-daily-news/bin/ustc-daily-news`

If the user asks whether the OpenClaw integration is installed correctly, check both:

```bash
openclaw skills info ustc-daily-news
${HOME}/.openclaw/ustc-daily-news/bin/ustc-daily-news help
```
