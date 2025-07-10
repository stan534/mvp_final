// routes/pnlDistribution.js
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { db } = require('../db');
const { summarizePnLDistribution } = require('../services/openai');

async function pnlDistributionRoute(fastify, options) {
  fastify.get('/pnl-distribution', async (request, reply) => {
    const { wallet } = request.query;

    if (!wallet) {
      return reply.code(400).send({ error: 'wallet is required' });
    }

    try {
      fastify.log.info(`Refreshing PnL for ${wallet} and computing distribution`);

      // 1️⃣ Fetch fresh PnL from SolanaTracker
      const url = `https://data.solanatracker.io/pnl/${wallet}`;
      fastify.log.info(`SolanaTracker GET ${url}`);
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          'X-API-Key': process.env.SOLSCAN_API_KEY
        }
      });
      const data = await res.json();
      if (!data) {
        fastify.log.error(`SolanaTracker PnL error for ${wallet}`);
        return reply.code(502).send({ error: 'Failed to fetch PnL' });
      }

      // 🔄 Manual upsert summary
      const summaryString = JSON.stringify(data.summary || data);
      let summaryId;
      const updateRes = await db.oneOrNone(
        `
        UPDATE wallet_pnl_summary
           SET summary      = $1,
               retrieved_at = NOW(),
               source       = 'solana-tracker'
         WHERE wallet_address = $2
         RETURNING id
        `,
        [summaryString, wallet]
      );
      if (updateRes) {
        summaryId = updateRes.id;
        fastify.log.info(`Updated PnL summary for ${wallet}`);
      } else {
        const { id } = await db.one(
          'SELECT COALESCE(MAX(id), 0) + 1 AS id FROM wallet_pnl_summary'
        );
        const insertRes = await db.one(
          `
          INSERT INTO wallet_pnl_summary
            (id, wallet_address, summary, retrieved_at, source)
          VALUES
            ($1, $2, $3, NOW(), 'solana-tracker')
          RETURNING id
          `,
          [id, wallet, summaryString]
        );
        summaryId = insertRes.id;
        fastify.log.info(`Inserted new PnL summary for ${wallet}`);
      }

      // 2️⃣ Replace tokens
      await db.none(`DELETE FROM wallet_pnl_tokens WHERE summary_id = $1`, [summaryId]);

      let tokenList = [];
      if (Array.isArray(data.tokens)) {
        tokenList = data.tokens;
      } else if (data.tokens && typeof data.tokens === 'object') {
        tokenList = Object.entries(data.tokens).map(
          ([tokenAddr, details]) => ({ token: tokenAddr, ...details })
        );
      }

      if (tokenList.length) {
        let nextTokenId = await db.one(
          'SELECT COALESCE(MAX(id), 0) + 1 AS id FROM wallet_pnl_tokens'
        );
        for (const token of tokenList) {
          await db.none(
            `INSERT INTO wallet_pnl_tokens
               (id, summary_id, wallet_address, token, details)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              nextTokenId.id++,
              summaryId,
              wallet,
              token.symbol || token.tokenSymbol || token.token,
              JSON.stringify(token)
            ]
          );
        }
      }

      // 3️⃣ Aggregate into buckets
      const distribution = await db.any(
        `
        SELECT
          CASE
            WHEN pnl < -0.5 THEN '<-50%'
            WHEN pnl BETWEEN -0.5 AND 0 THEN '–50–0%'
            WHEN pnl BETWEEN 0 AND 2 THEN '0–200%'
			WHEN pnl BETWEEN 2 AND 5 THEN '200–500%'
            ELSE '>500%'
          END AS bucket,
          COUNT(*) AS count
        FROM (
          SELECT
            (details->>'total')::numeric / (details->>'total_invested')::numeric AS pnl
          FROM wallet_pnl_tokens
          WHERE summary_id = $1
        ) x
        GROUP BY bucket
		ORDER BY bucket
        `,
        [summaryId]
      );

      const message = await summarizePnLDistribution({ wallet, distribution });
      return { wallet, distribution, message, source: 'solana-tracker' };
    } catch (err) {
      fastify.log.error(err);
      return reply
        .code(500)
        .send({ error: 'Failed to fetch PnL distribution', details: err.message });
    }
  });
}

module.exports = pnlDistributionRoute;
