require("dotenv").config();
const { App, ExpressReceiver } = require("@slack/bolt");
const { parseExpense } = require("./parser");
const { addExpense } = require("./notion");
const { uploadToCloudinary } = require("./cloudinary");

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver,
});

// Health check endpoint
receiver.router.get("/", (req, res) => {
  res.send("Expense bot is running.");
});

/**
 * Downloads a file from Slack (requires bot token for auth) and returns a Buffer
 */
async function downloadSlackFile(url) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to download Slack file: ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

app.message(async ({ message, say, client }) => {
  if (message.subtype && message.subtype !== "file_share") return;

  const text = message.text || "";
  const hasFiles = message.files && message.files.length > 0;

  if (!text.trim() && !hasFiles) return;

  const parsed = parseExpense(text);

  if (!parsed || parsed.amount === null) {
    await say({
      text: `Couldn't find an amount in that message. Try something like "lunch 250".`,
      thread_ts: message.ts,
    });
    return;
  }

  let receiptUrl;
  if (hasFiles) {
    try {
      const file = message.files[0];
      // Only handle images for now
      if (file.mimetype && file.mimetype.startsWith("image/")) {
        const buffer = await downloadSlackFile(file.url_private);
        receiptUrl = await uploadToCloudinary(buffer, file.name || "receipt.jpg");
      }
    } catch (err) {
      console.error("Receipt upload failed:", err);
      // Continue without receipt rather than failing the whole entry
    }
  }

  try {
    await addExpense({
      item: parsed.item,
      amount: parsed.amount,
      category: parsed.category,
      receiptUrl,
    });

    const receiptNote = hasFiles
      ? receiptUrl
        ? " 📎 receipt attached"
        : " (receipt upload failed, logged without it)"
      : "";

    await say({
      text: `✅ Logged: *${parsed.item}* — ${parsed.amount} (${parsed.category})${receiptNote}`,
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
