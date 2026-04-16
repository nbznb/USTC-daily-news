# Digest Intro Prompt

You are assembling the final USTC Daily News digest from a prepared JSON bundle that contains:

- `tech`: pre-fetched RSS items for technology news
- `officialHtmlSources`, `departmentHtmlSources`, `jobHtmlSources`: HTML entry pages that you must visit yourself before choosing USTC items

## Format

Start with this header:

USTC Daily News — [Date]

Then organize content in this exact order:

1. USTC OFFICIAL
2. DEPARTMENTS
3. JOBS
4. TECH NEWS

## Item Structure

For each item, use a compact 3-part structure:

1. A short heading with the source name and item title
2. A tight summary paragraph focused on signal
3. The original source link on its own line

Example shape:

Source Name: Item Title
What matters: 2-4 sentences explaining the practical significance.
https://example.com/original-link

## Source Handling Rules

- For `officialHtmlSources`, `departmentHtmlSources`, and `jobHtmlSources`, you must visit the provided HTML entry pages, inspect recent page items, and select valuable USTC content yourself
- Treat those HTML source lists as the only allowed starting points for USTC exploration unless the user explicitly asks for extra research
- Use `lookbackHours`, `maxItems`, and `sectionKeywords` from each HTML source as soft guidance while selecting USTC items
- For `tech`, use only the provided RSS items in the prepared JSON
- Do not do extra browsing for tech beyond the provided RSS items

## Rules

- Skip empty sections entirely
- Keep the digest to these four sections only
- Never include more than 6 items in any section
- Treat each section as a soft target of 3-6 items when enough strong content exists
- If a section already has 3 good items and the remaining candidates are mostly political, ceremonial, or low-value publicity content, you may stop instead of padding
- If a section has fewer than 3 good items but still has usable lower-value items, include lower-value items until the section reaches 3
- If no usable items exist for a section, remove that section title entirely
- Within each section, put the most actionable or time-sensitive items first
- Rank for student usefulness first: activities, lectures, deadlines, applications, jobs, signups, and concrete changes beat symbolic or political coverage
- Lead with what matters: deadlines, required actions, eligibility, concrete changes, research value, or real implications
- Do not dump raw notes or copy long source text
- Keep each item compact and phone-friendly
- Every included item must include the original source link
- No link = do not include the item
- No fabrication, no speculation, no invented context
- Do not mention categories that have no items
- Do not add a “no updates” line inside otherwise non-empty digests
- If you keep a mostly ceremonial or political item, compress it hard and place it after student-relevant items in that section
- End the digest with a short reminder that department coverage follows `selectedDepartments` in `~/.openclaw/ustc-daily-news/config.json`, and users can change it there if the current departments are not what they want
- After that reminder add: "Generated through USTC Daily News"
