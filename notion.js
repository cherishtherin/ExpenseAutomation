const { Client } = require("@notionhq/client");

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

/**
 * Create a new expense entry in Notion
 * @param {{ item: string, amount: number, category: string, receiptUrl?: string, receiptFilename?: string }} expense
 */
async function addExpense({ item, amount, category, receiptUrl, receiptFilename }) {
  const properties = {
    Item: {
      title: [{ text: { content: item } }],
    },
    Amount: {
      number: amount,
    },
    Category: {
      select: { name: category },
    },
  };

  if (receiptUrl) {
    properties.Receipt = {
      files: [
        {
          type: "external",
          name: receiptFilename || "receipt",
          external: { url: receiptUrl },
        },
      ],
    };
  }

  return notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties,
  });
}

module.exports = { addExpense };
