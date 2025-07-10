// routes/transfer.js
const { Connection, clusterApiUrl, LAMPORTS_PER_SOL, PublicKey } = require('@solana/web3.js');
const { db } = require('../db');
const { parseTransferIntent, generateConfirmationMessage } = require('../services/transferIntentParser');
const { addToConversation } = require('../services/conversations');

async function transferRoute(fastify, options) {
  // Connect to Solana Devnet with "confirmed" commitment
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

  // ──────────────
  // 1️⃣ Parse transfer intent
  // ──────────────
  fastify.post('/transfer/parse-intent', async (request, reply) => {
    const { message, conversationId } = request.body;
    if (!message) {
      return reply.code(400).send({ error: 'Message is required' });
    }
    try {
      const intent = await parseTransferIntent(message);
      if (!intent) {
        return { hasTransferIntent: false, message: "I don't see a transfer request in your message." };
      }
      const confirmationMessage = generateConfirmationMessage(intent);
      if (conversationId) {
        addToConversation(conversationId, [{
          role: 'assistant',
          content: confirmationMessage
        }]);
      }
      return {
        hasTransferIntent: true,
        intent,
        confirmationMessage,
        needsMoreInfo: false
      };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to parse transfer intent', details: err.message });
    }
  });

  // ──────────────
  // 2️⃣ Prepare transfer details
  // ──────────────
  fastify.post('/transfer/prepare', async (request, reply) => {
    const { amount, recipientAddress, senderAddress, conversationId } = request.body;

    if (typeof amount !== 'number' || amount <= 0) {
      return reply.code(400).send({ error: 'Invalid amount. Must be a positive number.' });
    }
    if (!recipientAddress) {
      return reply.code(400).send({ error: 'Recipient address is required.' });
    }

    const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
    const transactionDetails = {
      type: 'sol_transfer',
      from: senderAddress || null,
      to: recipientAddress,
      amount,
      lamports,
      estimatedFee: 5000, // ~0.000005 SOL
      status: 'prepared'
    };

    if (conversationId) {
      addToConversation(conversationId, [{
        role: 'assistant',
        content: `Prepared transfer: ${amount} SOL (${lamports} lamports) to ${recipientAddress}.`
      }]);
    }

    return reply.send(transactionDetails);
  });

  // ──────────────
  // 3️⃣ Broadcast signed transaction & record in DB
  // ──────────────
  fastify.post('/transfer/send', async (request, reply) => {
    const { signedTransaction, amount, to, from, conversationId } = request.body;
    if (!signedTransaction) {
      return reply.code(400).send({ error: 'Signed transaction (base64) is required.' });
    }

    try {
      // Deserialize and send
      const txBuffer = Buffer.from(signedTransaction, 'base64');
      const signature = await connection.sendRawTransaction(txBuffer, { skipPreflight: false });
      await connection.confirmTransaction(signature, 'confirmed');

      // Fetch transaction details
      const txInfo = await connection.getTransaction(signature, { commitment: 'confirmed' });
      const blockTime = txInfo?.blockTime ?? null;
      const fee = txInfo?.meta?.fee ?? 0;

      // Persist to `transactions` table
      const txIdRes = await db.one('SELECT COALESCE(MAX(id),0)+1 AS id FROM transactions');
      await db.none(
        `INSERT INTO transactions
          (id, transaction_hash, status, block_time, fee, signer, source)
         VALUES
          ($1, $2, $3, to_timestamp($4), $5, $6, $7)`,
        [txIdRes.id, signature, 'confirmed', blockTime, fee, from, 'transfer']
      );

      // Persist to `instructions` table
      const instrIdRes = await db.one('SELECT COALESCE(MAX(id),0)+1 AS id FROM instructions');
      await db.none(
        `INSERT INTO instructions
          (id, transaction_id, program, instruction_type, from_address, to_address, lamports)
         VALUES
          ($1, $2, $3, $4, $5, $6, $7)`,
        [
          instrIdRes.id,
          txIdRes.id,
          'system',
          'transfer',
          from,
          to,
          Math.floor(amount * LAMPORTS_PER_SOL),
        ]
      );

      // Add confirmation to conversation history
      if (conversationId) {
        addToConversation(conversationId, [{
          role: 'assistant',
          content: `✅ Sent ${amount} SOL to ${to}. Tx signature: ${signature}`
        }]);
      }

      return reply.send({
        success: true,
        transactionSignature: signature,
        explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Transfer failed', details: err.message });
    }
  });
}

module.exports = transferRoute;
