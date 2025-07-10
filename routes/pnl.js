// routes/pnl.js
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { db } = require('../db');
const { summarizePnL } = require('../services/openai');

async function pnlRoute(fastify, options) {
  fastify.get('/pnl', async (request, reply) => {
    const { wallet, showHistoricPnL, holdingCheck, hideDetails } = request.query;

    if (!wallet) {
      return reply.code(400).send({ error: 'wallet is required' });
    }

    try {
      fastify.log.info(`Fetching live PnL for ${wallet} from SolanaTracker`);
      const url = new URL(`https://data.solanatracker.io/pnl/${wallet}`);
      if (showHistoricPnL !== undefined) url.searchParams.append('showHistoricPnL', showHistoricPnL);
      if (holdingCheck       !== undefined) url.searchParams.append('holdingCheck',    holdingCheck);
      if (hideDetails        !== undefined) url.searchParams.append('hideDetails',     hideDetails);

      fastify.log.info(`SolanaTracker GET ${url.toString()}`);
      const res = await fetch(url.toString(), {
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
      let inserted;
      const updateRes = await db.oneOrNone(
        `
        UPDATE wallet_pnl_summary
           SET summary      = $1,
               retrieved_at = NOW(),
               source       = 'solana-tracker'
         WHERE wallet_address = $2
         RETURNING *
        `,
        [summaryString, wallet]
      );
      if (updateRes) {
        inserted = updateRes;
        fastify.log.info(`Updated PnL summary for ${wallet}`);
      } else {
        const { id } = await db.one(
          'SELECT COALESCE(MAX(id), 0) + 1 AS id FROM wallet_pnl_summary'
        );
        inserted = await db.one(
          `
          INSERT INTO wallet_pnl_summary
            (id, wallet_address, summary, retrieved_at, source)
          VALUES
            ($1, $2, $3, NOW(), 'solana-tracker')
          RETURNING *
          `,
          [id, wallet, summaryString]
        );
        fastify.log.info(`Inserted new PnL summary for ${wallet}`);
      }

      // Replace tokens
      await db.none(`DELETE FROM wallet_pnl_tokens WHERE summary_id = $1`, [inserted.id]);

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
          await db.one(
            `INSERT INTO wallet_pnl_tokens
               (id, summary_id, wallet_address, token, details)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [
              nextTokenId.id++,
              inserted.id,
              wallet,
              token.symbol || token.tokenSymbol || token.token,
              JSON.stringify(token)
            ]
          );
        }
      }

      const result = {
        summary: inserted,
        tokens:  tokenList,
        source:  'solana-tracker'
      };
      result.message = await summarizePnL(inserted.summary);

      return result;
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to fetch PnL', details: err.message });
    }
  });
}

module.exports = pnlRoute;
