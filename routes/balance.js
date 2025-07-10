const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { db } = require('../db');

async function balanceRoute(fastify, options) {
  fastify.get('/balance', async (request, reply) => {
    const { address, mock } = request.query;
    if (!address) {
      return reply.code(400).send({ error: 'Wallet address is required' });
    }
    if (mock === 'true') {
      return { address, balance: 42.42, token: 'SOL', source: 'mock' };
    }

    try {
      // 🔄 Always fetch live balance
      fastify.log.info(`Fetching live balance for ${address} from Expand.Network`);
      const url = `https://api.expand.network/chain/getbalance?chainId=900&address=${address}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          'X-API-Key': process.env.EXPAND_API_KEY
        }
      });
      const data = await res.json();
      if (!data || data.error) {
        fastify.log.error(`Expand.Network balance error for ${address}`);
        return reply.code(502).send({ error: 'Failed to fetch balance' });
      }

      const lamports = Number(
        data.data?.balance ?? data.balance ?? data.result?.value ?? 0
      );
      const token = data.token || 'SOL';

      // 🔄 Manual upsert: try UPDATE first, then INSERT with new id if no row was affected
      const updateRes = await db.result(
        `
        UPDATE wallet_balances
           SET balance_lamports = $1,
               token            = $2,
               source           = 'expand-network',
               retrieved_at     = NOW()
         WHERE address = $3
        `,
        [lamports, token, address]
      );

      if (updateRes.rowCount === 0) {
        // compute next id manually
        const { id } = await db.one(
          'SELECT COALESCE(MAX(id), 0) + 1 AS id FROM wallet_balances'
        );
        await db.none(
          `
          INSERT INTO wallet_balances
            (id, address, balance_lamports, token, source, retrieved_at)
          VALUES
            ($1, $2, $3, $4, 'expand-network', NOW())
          `,
          [id, address, lamports, token]
        );
        fastify.log.info(`Inserted new balance (id=${id}) for ${address}`);
      } else {
        fastify.log.info(`Updated balance for ${address}`);
      }

      // Return full JSON so client has all details
      return data;
    } catch (err) {
      fastify.log.error(err);
      return reply
        .code(500)
        .send({ error: 'Failed to fetch balance', details: err.message });
    }
  });
}

module.exports = balanceRoute;