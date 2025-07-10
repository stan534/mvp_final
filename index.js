require('dotenv').config();
const Fastify = require('fastify');
const cors = require('@fastify/cors');
const nlpRoute = require('./routes/nlp');
const balanceRoute = require('./routes/balance');
const transactionRoute = require('./routes/transaction');
const pnlRoute = require('./routes/pnl');
const pnlDistributionRoute = require('./routes/pnlDistribution');
const filesRoute = require('./routes/files');
const transferRoute = require('./routes/transfer');

const app = Fastify({ logger: true });

app.register(cors, { origin: '*' });
if (!process.env.EXPAND_API_KEY) {
  app.log.warn('EXPAND_API_KEY is not set. Third-party API calls may fail.');
}
app.register(balanceRoute);
app.register(transactionRoute);
app.register(pnlRoute);
app.register(pnlDistributionRoute);
app.register(nlpRoute);
app.register(filesRoute);
app.register(transferRoute);

const start = async () => {
  try {
    await app.listen({ port: 3000, host: '0.0.0.0' }); //  listen on all interfaces
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
