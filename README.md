# Expense Bot — Slack to Notion (v4: dates + new categories)

## What's new in v4

### Date parsing
Messages can include a date in many formats:
- "french class 3700 in january" → Jan 1 of current year
- "french class 3700 jan 23" / "23 jan" → Jan 23 of current year
- "french class 3700 jan 23 2025" / "23 jan 2025" → Jan 23, 2025
- No date mentioned → defaults to today's date

### Updated categories
- **Food & Drinks** (was "Food") — includes bubble tea, boba, drinks etc.
- **Education** — class, course, tuition, lesson, book, school, workshop, exam, etc.
- **Leisure** — netflix, cinema, movie, spotify, game, concert, etc.
- **Transport** — unchanged
- **Bills** — unchanged
- **Health** — unchanged
- **Other** — fallback (note: "macbook m5 39000" now falls into Other since
  the old "Electronics" category was removed per the new spec — let me know
  if you want Electronics back as its own category)

## Notion setup change

Add a new property to your database:
- **Date** — type **Date**

## All other setup

Same as v3 (Slack scopes, Cloudinary, Render env vars) — no new env vars needed.

## Known limitation

"Month + year only" (no day), e.g. "spotify 150 dec 2024", isn't fully
supported — amount parsing works correctly, but the date may not register
as December 2024 exactly. This format wasn't in the original spec
(day+month, month+day, or month-only formats are supported).
