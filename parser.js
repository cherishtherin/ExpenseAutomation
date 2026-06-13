/**
 * Parses a message like "macbook m5 39000" or "french class 3700 in january"
 * into { item, amount, category, date }
 */

const CATEGORY_RULES = [
  { category: "Food & Drinks", pattern: /\b(food|foods|meal|meals|lunch|dinner|breakfast|snack|snacks|coffee|restaurant|cafe|groceries|grocery|bubble tea|boba|milk tea|tea|drink|drinks|juice)\b/i },
  { category: "Education", pattern: /\b(class|classes|course|courses|tuition|lesson|lessons|book|books|school|university|college|workshop|seminar|training|french class|exam|textbook)\b/i },
  { category: "Leisure", pattern: /\b(netflix|cinema|movie|movies|spotify|game|games|gaming|concert|theatre|theater|disney\+?|hbo|youtube premium|hobby|fun|entertainment|outing)\b/i },
  { category: "Transport", pattern: /\b(grab|gojek|taxi|transport|bus|train|mrt|gas|fuel|uber|parking|toll)\b/i },
  { category: "Bills", pattern: /\b(rent|electricity|water bill|wifi|internet|bill|bills|utilities|subscription)\b/i },
  { category: "Health", pattern: /\b(medicine|doctor|pharmacy|health|clinic|hospital|vitamins?)\b/i },
];

// Number tokens: digits possibly grouped with spaces/commas, optional decimal,
// optional short currency suffix.
const NUMBER_TOKEN_REGEX = /\d[\d,]*(?:\s\d{3})*(?:\.\d{1,2})?\s*(?:nt|ntd|twd|usd|idr|rp)?\b/gi;

const MONTH_NAMES = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

const MONTH_NAME_PATTERN = Object.keys(MONTH_NAMES)
  .sort((a, b) => b.length - a.length) // longer names first to avoid partial matches
  .join("|");

// Date patterns to try, in order of specificity:
// 1. "23 jan 2025" / "23 january 2025"
// 2. "jan 23 2025" / "january 23, 2025"
// 3. "23 jan" / "23rd january"
// 4. "jan 23" / "january 23rd"
// 5. "in january" / "january" (month only -> day 1 of that month)
const DATE_PATTERNS = [
  // day month year: "23 jan 2025", "23rd january 2025"
  {
    regex: new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_NAME_PATTERN})\\s+(\\d{4})\\b`, "i"),
    extract: (m) => ({ day: parseInt(m[1], 10), month: MONTH_NAMES[m[2].toLowerCase()], year: parseInt(m[3], 10) }),
  },
  // month day year: "jan 23 2025", "january 23, 2025"
  {
    regex: new RegExp(`\\b(${MONTH_NAME_PATTERN})\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`, "i"),
    extract: (m) => ({ day: parseInt(m[2], 10), month: MONTH_NAMES[m[1].toLowerCase()], year: parseInt(m[3], 10) }),
  },
  // day month (no year): "23 jan", "23rd january"
  {
    regex: new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_NAME_PATTERN})\\b`, "i"),
    extract: (m) => ({ day: parseInt(m[1], 10), month: MONTH_NAMES[m[2].toLowerCase()], year: null }),
  },
  // month day (no year): "jan 23", "january 23rd"
  {
    regex: new RegExp(`\\b(${MONTH_NAME_PATTERN})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, "i"),
    extract: (m) => ({ day: parseInt(m[2], 10), month: MONTH_NAMES[m[1].toLowerCase()], year: null }),
  },
  // month only: "in january", "january"
  {
    regex: new RegExp(`\\b(?:in\\s+)?(${MONTH_NAME_PATTERN})\\b`, "i"),
    extract: (m) => ({ day: 1, month: MONTH_NAMES[m[1].toLowerCase()], year: null }),
  },
];

/**
 * Extracts a date from text. Returns { date: Date, matchStart, matchEnd } or null.
 * If a year isn't specified, uses the current year (or previous year if the
 * resulting date would be in the future relative to today... we keep it simple:
 * current year always, per the requested spec).
 */
function extractDate(text) {
  for (const { regex, extract } of DATE_PATTERNS) {
    const match = text.match(regex);
    if (match) {
      const { day, month, year } = extract(match);
      const finalYear = year !== null ? year : new Date().getFullYear();

      // Validate day for the given month/year
      const date = new Date(finalYear, month, day);
      if (date.getMonth() !== month) {
        // invalid day (e.g. Feb 30) - skip this pattern
        continue;
      }

      return {
        date,
        matchStart: match.index,
        matchEnd: match.index + match[0].length,
      };
    }
  }
  return null;
}

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

function extractItem(text, numberToken, dateMatch) {
  let item = text;

  // Build a list of ranges to remove (number token + date match), sorted descending
  // by start index so removal doesn't shift earlier indices.
  const ranges = [];
  if (numberToken) ranges.push({ start: numberToken.start, end: numberToken.end });
  if (dateMatch) ranges.push({ start: dateMatch.matchStart, end: dateMatch.matchEnd });

  ranges.sort((a, b) => b.start - a.start);

  for (const r of ranges) {
    item = item.slice(0, r.start) + " " + item.slice(r.end);
  }

  // Remove leftover currency words/symbols and standalone "in"
  item = item.replace(/\b(nt|ntd|twd|usd|idr|rp|rupiah|dollars?|bucks?)\b/gi, " ");
  item = item.replace(/[$₩₱₪元]/g, " ");
  item = item.replace(/\bin\b/gi, " ");

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

function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Main parse function
 * @param {string} text - raw Slack message text
 * @returns {{ item: string, amount: number|null, category: string, date: string } | null}
 */
function parseExpense(text) {
  if (!text || !text.trim()) return null;

  const numbers = tokenizeNumbers(text);

  // Extract date FIRST, so its digits can be excluded from amount candidates.
  let dateMatch = extractDate(text);

  // Filter out number tokens that fall within the date match range
  let candidateNumbers = numbers;
  if (dateMatch) {
    candidateNumbers = numbers.filter(
      (tok) => !(tok.start < dateMatch.matchEnd && tok.end > dateMatch.matchStart)
    );
  }

  let amountToken = null;
  for (const tok of candidateNumbers) {
    const looksLikeYear = tok.digitCount === 4 && tok.value >= 1900 && tok.value <= 2099;
    if (looksLikeYear && candidateNumbers.length > 1) continue;

    if (
      !amountToken ||
      tok.digitCount > amountToken.digitCount ||
      (tok.digitCount === amountToken.digitCount && tok.start > amountToken.start)
    ) {
      amountToken = tok;
    }
  }

  // If the date match overlaps with the chosen amount token (rare edge case),
  // drop the date match.
  if (dateMatch && amountToken) {
    const overlaps =
      dateMatch.matchStart < amountToken.end && dateMatch.matchEnd > amountToken.start;
    if (overlaps) {
      dateMatch = null;
    }
  }

  const amount = amountToken ? amountToken.value : null;
  const item = extractItem(text, amountToken, dateMatch);
  const category = detectCategory(text);
  const date = formatDateISO(dateMatch ? dateMatch.date : new Date());

  return { item, amount, category, date };
}

module.exports = { parseExpense, tokenizeNumbers, extractItem, detectCategory, extractDate, formatDateISO };
