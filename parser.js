/**
 * Parses a message like "macbook m5 39000" or "lunch 39 000" or "39000nt coffee"
 * into { item, amount, category }
 *
 * Strategy: find all number-like tokens in the message. The amount is the
 * token with the most digits (the price). Everything else becomes the item.
 */

const CATEGORY_RULES = [
  { category: "Food", pattern: /\b(food|foods|meal|meals|lunch|dinner|breakfast|snack|snacks|coffee|restaurant|cafe|groceries|grocery|bubble tea|boba|milk tea|tea|drink|drinks|juice)\b/i },
  { category: "Transport", pattern: /\b(grab|gojek|taxi|transport|bus|train|mrt|gas|fuel|uber|parking|toll)\b/i },
  { category: "Electronics", pattern: /\b(macbook|laptop|iphone|ipad|phone|electronics|charger|cable|gadget|monitor|keyboard|mouse|headphone|earbud|airpods?)\b/i },
  { category: "Bills", pattern: /\b(rent|electricity|water bill|wifi|internet|bill|bills|utilities|subscription)\b/i },
  { category: "Clothing", pattern: /\b(shirt|shirts|clothes|clothing|shoes|shoe|fashion|jacket|pants|dress)\b/i },
  { category: "Health", pattern: /\b(medicine|doctor|pharmacy|health|clinic|hospital|vitamins?)\b/i },
];

// Matches number tokens: digits possibly grouped with spaces/commas,
// optional decimal, optional short currency suffix.
const NUMBER_TOKEN_REGEX = /\d[\d,]*(?:\s\d{3})*(?:\.\d{1,2})?\s*(?:nt|ntd|twd|usd|idr|rp)?\b/gi;

function tokenizeNumbers(text) {
  const results = [];
  let match;
  const regex = new RegExp(NUMBER_TOKEN_REGEX);
  while ((match = regex.exec(text)) !== null) {
    const raw = match[0];

    const precedingChar = text[match.index - 1];
    const isAttachedToLetter = precedingChar && /[a-zA-Z]/.test(precedingChar);
    const digitsOnly = raw.replace(/[^\d.]/g, "");
    const integerDigitCount = digitsOnly.split(".")[0].length;

    if (isAttachedToLetter && integerDigitCount === 1) {
      continue;
    }

    if (!digitsOnly) continue;

    const value = parseFloat(digitsOnly);

    results.push({
      value,
      start: match.index,
      end: regex.lastIndex,
      raw,
      digitCount: digitsOnly.replace(".", "").length,
    });
  }
  return results;
}

function extractItem(text, numberToken) {
  let item = text;
  if (numberToken) {
    item = text.slice(0, numberToken.start) + " " + text.slice(numberToken.end);
  }

  item = item.replace(/\b(nt|ntd|twd|usd|idr|rp|rupiah|dollars?|bucks?)\b/gi, " ");
  item = item.replace(/[$₩₱₪元]/g, " ");

  item = item.replace(/\s+/g, " ").trim();
  if (!item) item = "Unnamed expense";

  return item
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function detectCategory(text) {
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(text)) {
      return rule.category;
    }
  }
  return "Other";
}

/**
 * Main parse function
 * @param {string} text - raw Slack message text
 * @returns {{ item: string, amount: number|null, category: string } | null}
 */
function parseExpense(text) {
  if (!text || !text.trim()) return null;

  const numbers = tokenizeNumbers(text);

  let amountToken = null;
  for (const tok of numbers) {
    if (
      !amountToken ||
      tok.digitCount > amountToken.digitCount ||
      (tok.digitCount === amountToken.digitCount && tok.start > amountToken.start)
    ) {
      amountToken = tok;
    }
  }

  const amount = amountToken ? amountToken.value : null;
  const item = extractItem(text, amountToken);
  const category = detectCategory(text);

  return { item, amount, category };
}

module.exports = { parseExpense, tokenizeNumbers, extractItem, detectCategory };
