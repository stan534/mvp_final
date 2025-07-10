const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function askLLM(messages) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `
You are a PostgreSQL assistant for a Solana blockchain database.
Only respond with a single PostgreSQL SELECT statement based on this schema.
Do NOT explain. Do NOT use markdown or backticks. Just return a query.

Schema:

transactions(id, transaction_hash, status, block_time, fee, signer, source, inserted_at)
instructions(id, transaction_id, program, instruction_type, from_address, to_address, lamports)
wallet_balances(id, address, balance_lamports, balance_sol, token, source, retrieved_at)
        `.trim(),
      },
      ...messages,
    ],
  });

  const raw = completion.choices[0].message.content.trim();
  console.log("🧠 LLM RAW OUTPUT:", raw);

  return { sql: raw };
}

const FUNCTIONS = [
  {
    name: "get_balance",
    description: "Get the balance of a Solana wallet",
    parameters: {
      type: "object",
      properties: {
        address: { type: "string", description: "wallet address" },
      },
      required: ["address"],
    },
  },
  {
    name: "get_transaction",
    description: "Get details for a Solana transaction by hash",
    parameters: {
      type: "object",
      properties: {
        transactionHash: {
          type: "string",
          description: "transaction signature",
        },
      },
      required: ["transactionHash"],
    },
  },
  {
    name: "get_pnl",
    description: "Get profit and loss summary for a wallet",
    parameters: {
      type: "object",
      properties: {
        wallet: { type: "string", description: "wallet address" },
      },
      required: ["wallet"],
    },
  },
  {
    name: "get_pnl_distribution",
    description: "Get PnL distribution buckets for a wallet",
    parameters: {
      type: "object",
      properties: {
        wallet: { type: "string", description: "wallet address" },
      },
      required: ["wallet"],
    },
  },
];

async function chooseEndpoint(messages) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    tools: FUNCTIONS.map((fn) => ({ type: "function", function: fn })),
    tool_choice: "auto",
  });

  const message = completion.choices[0].message;
  console.log("🧠 LLM RAW OUTPUT:", JSON.stringify(message));

  const call = message.tool_calls && message.tool_calls[0];
  let action = null;

  if (call) {
    let args = {};
    try {
      args = JSON.parse(call.function.arguments || "{}");
    } catch (err) {
      console.error("Failed to parse function args", err);
    }
    action = { name: call.function.name, args };
  }

  return { action, content: message.content };
}

async function chatAssistant(messages) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "You are a helpful Solana blockchain assistant. If the user request is unclear or invalid, politely explain how they can correct it.",
      },
      ...messages,
    ],
  });

  return completion.choices[0].message.content.trim();
}

async function summarizePnL(data) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "You explain Solana wallet profit and loss (PnL) data in plain English for non-technical users. Do not mention any surce files or anything - just present a comprehensive PNL summary for a given wallet with all details and analytics. Be professional and not very technical.",
      },
      { role: "user", content: `Summarize this PnL JSON:\n${JSON.stringify(data)}` },
    ],
  });

  return completion.choices[0].message.content.trim();
}

async function summarizePnLDistribution(data) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "You explain Solana wallet PnL distribution buckets in plain English for non-technical users. Do not mention any source files or anything - just present a concise summary of the distribution.",
      },
      { role: "user", content: `Summarize this PnL distribution JSON:\n${JSON.stringify(data)}` },
    ],
  });

  return completion.choices[0].message.content.trim();
}

module.exports = {
  askLLM,
  chooseEndpoint,
  chatAssistant,
  summarizePnL,
  summarizePnLDistribution,
};
