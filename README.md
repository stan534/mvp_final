# Solana AI Agent MVP

A minimal AI-powered Solana analytics agent with a ChatGPT-style frontend. Query wallet balances and transaction details using real or mock blockchain data.

---

## ⚙️ Installation Guide (For Collaborators)

> Prerequisites:  
> ✅ [Docker Desktop](https://www.docker.com/products/docker-desktop) installed and running  
> ✅ Git installed

### Step 1: Clone the repository

```bash
git clone https://github.com/verticalonchaindata/solana-ai-agent.git
cd solana-ai-agent
```

### Step 2: Run the full app stack (backend, frontend, database)

```bash
docker compose up --build
```

- Frontend: [http://localhost:3001](http://localhost:3001)
- Backend: [http://localhost:3000](http://localhost:3000)

✅ The PostgreSQL database will be auto-seeded with synthetic data
✅ The backend and frontend containers will automatically link
✅ No manual SQL or dependency setup required

Create a `.env` file and include your Expand.Network API key:

```env
EXPAND_API_KEY=your-key-here
```

To stop and remove everything:
```bash
docker compose down -v
```

### Fast Rebuilds During Development

If you change backend code and need to rebuild the containers quickly:

```bash
docker compose build backend && docker compose up backend
```

This rebuilds only the backend image and restarts the container without touching the database or frontend.

---

## 🧱 Tech Stack

- **Backend**: Node.js + Fastify
- **Database**: PostgreSQL (Dockerized)
- **Frontend**: React (Create React App)
- **RPC**: Solana Mainnet Beta
- **ORM**: pg-promise
- **DevOps**: Docker + Docker Compose

---

## 🧪 API Examples

| Endpoint | Description |
|----------|-------------|
| `GET /balance?address=...` | Real wallet balance |
| `GET /balance?address=...&mock=true` | Mock balance |
| `GET /transaction?transactionHash=...` | Real transaction |
| `GET /transaction?transactionHash=...&mock=true` | Mock transaction |
| `GET /pnl?wallet=...` | Wallet PnL summary with AI explanation |
| `POST /upload` | Upload wallet list (.txt, .csv, .xls, .xlsx) |

The `/upload` endpoint accepts optional query parameters:
`type` can be `wallets` (default) or `transactions` and `format` can be
`csv` (default) or `json`. Use `format=json` for a JSON response or
`format=csv` to download a CSV file.

Both endpoints first check the PostgreSQL cache. If data is missing, the server
queries Expand.Network using the `EXPAND_API_KEY` and then stores the result.
When a cache miss occurs, the full JSON response from Expand.Network is
returned to the client so it can be displayed in the UI.

All Expand.Network calls use `chainId=900` to target the Solana blockchain. A raw request example for fetching a balance looks like:

```javascript
const options = {
  method: 'GET',
  headers: {
    accept: 'application/json',
    'Content-Type': 'application/json',
    'X-API-Key': 'PaOLfcyHoJ3oDIHeD01VX3771ufpCN5y23UE1BBQ'
  }
};

fetch('https://api.expand.network/chain/getbalance?chainId=900&address=<ADDRESS>', options)
  .then(r => r.json())
  .then(console.log);
```

A similar request for fetching a transaction looks like:

```javascript
const options = {
  method: 'GET',
  headers: {
    accept: 'application/json',
    'Content-Type': 'application/json',
    'X-API-Key': 'PaOLfcyHoJ3oDIHeD01VX3771ufpCN5y23UE1BBQ'
  }
};

fetch('https://api.expand.network/chain/gettransaction?chainId=900&transactionHash=<HASH>', options)
  .then(r => r.json())
  .then(console.log);
```

### NLP Endpoint (Experimental)

`POST /nlp` now uses OpenAI's **function calling** capability. The model chooses
between `get_balance`, `get_transaction` and `get_pnl` based on the prompt and
calls the corresponding API route. If the data isn't cached in PostgreSQL, the
backend fetches it from Expand.Network or SolanaTracker, stores it, and returns
the full JSON payload.

The endpoint also supports an optional `conversationId` parameter. If you pass a
known ID, your new message is appended to that conversation's history and the
full history is sent to the LLM. If omitted or unknown, a new `conversationId`
is generated and returned so you can continue the thread in subsequent calls.

Example request body:

```json
{
  "conversationId": "<optional-id>",
  "prompt": "Show my wallet balance"
}
```

Every response now includes the `conversationId` so clients can persist it.

The `/pnl` endpoint automatically runs the resulting JSON
through OpenAI to generate a short, human‑readable summary.

---

## 🔍 Folder Structure

```
solana-ai-agent/
├── .env                   # Environment config (excluded from Git)
├── db-init/              # SQL file to seed the DB on startup
│   └── add_pnl_tables.sql
├── docker-compose.yml    # Docker services: db, backend, frontend
├── Dockerfile            # Backend Dockerfile
├── index.js              # Fastify backend entry
├── db.js                 # PostgreSQL connector
├── nlp.js                # Prompt-to-SQL stub (future feature)
├── frontend/             # React app (served separately)
└── .gitignore            # Prevents committing secrets and logs
```

---

## ✅ Current Feature Status

✅ Backend API server (Fastify)  
✅ PostgreSQL database with auto-seeding  
✅ Working React frontend  
✅ Real + mock data query capability  
⬜ NLP-to-SQL translation (coming soon)  
⬜ Stripe subscription billing (coming soon)

---

## 🧠 Vision

Build an AI-driven vertical SaaS tool to query on-chain data (e.g. Solana wallets and txns) with natural language, simplifying analytics for crypto professionals.
