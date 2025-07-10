require('dotenv').config();
const pgp = require('pg-promise')();

const db = pgp({
  host: 'db', // ← this must match service name in docker-compose
  port: 5432,
  database: 'solana_ai',
  user: 'postgres',
  password: 'devpass',
});

async function runSafeQuery(sql) {
  try {
    return await db.any(sql);
  } catch (err) {
    console.error('DB ERROR:', err.message || err);
    throw err;
  }
}

module.exports = { db, runSafeQuery };
