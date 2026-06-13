require("dotenv").config();
const { App, ExpressReceiver } = require("@slack/bolt");
const { parseExpense } = require("./parser");
const { addExpense } = require("./notion");

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver,
});

// Health check endpoint (Render pings this to confirm the service is alive)
receiver.router.get("/", (req, res) => {
  res.send("Expense bot is running.");
});

// Listen for any message posted in channels the bot is in
app.message(async ({ message, say, client }) => {
  // Ignore bot messages, edits, deletions, etc.
  if (message.subtype) return;
  if (!message.text) return;

  const parsed = parseExpense(message.text);

  if (!parsed || parsed.amount === null) {
    await say({
      text: `Couldn't find an amount in that message. Try something like "lunch 250".`,
      thread_ts: message.ts,
    });
    return;
  }

  try {
    await addExpense({
      item: parsed.item,
      amount: parsed.amount,
      category: parsed.category,
    });

    await say({
      text: `✅ Logged: *${parsed.item}* — ${parsed.amount} (${parsed.category})`,
      thread_ts: message.ts,
    });
  } catch (err) {
    console.error("Error adding expense to Notion:", err);
    await say({
      text: `⚠️ Something went wrong saving that to Notion. Please check the logs.`,
      thread_ts: message.ts,
    });
  }
});

const PORT = process.env.PORT || 3000;

(async () => {
  await app.start(PORT);
  console.log(`Expense bot is running on port ${PORT}`);
})();
