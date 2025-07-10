const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { db } = require('../db');

async function transactionRoute(fastify, options) {
  fastify.get('/transaction', async (request, reply) => {
    const { transactionHash, mock } = request.query;

    if (!transactionHash) {
      return reply.code(400).send({ error: 'transactionHash is required' });
    }

    // Return mock data
    if (mock === 'true') {
      return {
        transactionHash,
        status: 'confirmed',
        blockTime: 1710000000,
        fee: 5000,
        signer: 'MockSender111',
        instructions: [
          { program: 'system', type: 'transfer', from: 'MockSender111', to: 'MockReceiver222', lamports: 1000000 }
        ],
        source: 'mock'
      };
    }

    try {
      // 1️⃣ Check cache first
      const cached = await db.oneOrNone(
        `SELECT * FROM transactions WHERE transaction_hash = $1 LIMIT 1`,
        [transactionHash]
      );

      if (cached) {
        fastify.log.info(`Transaction cache hit for ${transactionHash}`);
        return {
          transactionHash: cached.transaction_hash,
          status: cached.status,
          blockTime: cached.block_time,
          fee: cached.fee,
          signer: cached.signer,
          source: 'cache'
        };
      }

      fastify.log.info(
        `Transaction cache miss for ${transactionHash}; calling Expand.Network`
      );
      // 2️⃣ Fallback to third-party (Expand.Network)
      const url =
        `https://api.expand.network/chain/gettransaction?chainId=900&transactionHash=${transactionHash}`;
      fastify.log.info(`Expand.Network GET ${url}`);
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          'X-API-Key': process.env.EXPAND_API_KEY
        }
      });

      const data = await res.json();

      if (!data || !data.data) {
        fastify.log.error(
          `Expand.Network transaction error for ${transactionHash}`
        );
        return reply
          .code(res.status >= 400 ? res.status : 502)
          .send(data);
      }

      const tx = data.data;

      const nextId = await db.oneOrNone(
        'SELECT COALESCE(MAX(id), 0) + 1 AS id FROM transactions'
      );

      await db.none(
        `INSERT INTO transactions (id, transaction_hash, status, block_time, fee, signer, source)
         VALUES ($1, $2, $3, to_timestamp($4), $5, $6, $7)`,
        [
          nextId.id,
          transactionHash,
          JSON.stringify(tx.transactionStatus),
          tx.timestamp,
          tx.transactionFees,
          tx.from,
          'expand-network'
        ]
      );
      fastify.log.info(`Stored transaction ${transactionHash} from Expand.Network`);

      return data; // ⬅️ expose full Expand.Network JSON
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to fetch transaction', details: err.message });
    }
  });
}

module.exports = transactionRoute;
