# Expense Bot — Slack to Notion

Send a message like `macbook m5 39000` to a Slack channel, and the bot
automatically logs it to your Notion database with Item, Amount, and
Category (auto-detected).

## Files

- `index.js` — main app (Slack listener)
- `parser.js` — regex-based expense parser (item, amount, category)
- `notion.js` — Notion API client
- `.env.example` — required environment variables (copy to `.env` locally)

## Local setup

```bash
npm install
cp .env.example .env
# fill in .env with your real tokens
npm start
```

## Notion setup

1. Create a database with these properties:
   - **Item** — Title
   - **Amount** — Number
   - **Category** — Select (Food, Transport, Electronics, Bills, Clothing, Health, Other)
2. Go to notion.so/my-integrations → create an integration → copy the token → `NOTION_TOKEN`
3. Share your database with the integration (••• menu → Connections → add it)
4. Copy the database ID from the URL (the 32-char string before `?v=`) → `NOTION_DATABASE_ID`

## Slack setup

1. Create an app at api.slack.com/apps
2. Add Bot Token Scopes: `chat:write`, `channels:history`
3. Install to workspace → copy Bot Token (`xoxb-...`) → `SLACK_BOT_TOKEN`
4. Basic Information → copy Signing Secret → `SLACK_SIGNING_SECRET`
5. After deploying to Render (see below), go to **Event Subscriptions**:
   - Enable Events
   - Request URL: `https://YOUR-RENDER-URL.onrender.com/slack/events`
   - Subscribe to bot event: `message.channels`
6. Invite the bot to your expense channel: `/invite @ExpenseBot`

## Deploy to Render

1. Push this folder to a GitHub repo
2. On Render: New → Web Service → connect the repo
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variables (from `.env.example`) in Render's dashboard
6. Deploy — copy the live URL and use it for Slack's Event Subscriptions URL above

## Usage

Post messages like:
- `macbook m5 39000`
- `lunch 250`
- `coffee 4.50`
- `grab to airport 350`

The bot replies in-thread confirming what was logged.

## Notes / v2 ideas

- Receipt photo uploads aren't yet wired to Notion's Files property
  (requires either external hosting or Notion's upload API flow).
- Category keywords are in `parser.js` — easy to extend.
- AI-based parsing (typo tolerance, smarter categories) can be added later
  as a fallback when regex parsing returns low confidence.
