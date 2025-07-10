// routes/nlp.js
const { askLLM, chooseEndpoint, chatAssistant } = require('../services/openai');
const {
  startConversation,
  getConversation,
  addToConversation,
} = require('../services/conversations');
const { runSafeQuery } = require('../db');
const {
  parseTransferIntent,
  generateConfirmationMessage,
} = require('../services/transferIntentParser');

async function nlpRoute(fastify, options) {
  fastify.post('/nlp', async (request, reply) => {
    const { messages = [], prompt, conversationId } = request.body;
    // Build newMsgs from either an array or a single prompt
    const newMsgs = Array.isArray(messages) && messages.length
      ? messages
      : prompt
        ? [{ role: 'user', content: prompt }]
        : [];

    let convoId = conversationId;
    let convo;
    // Continue or start a conversation
    if (convoId && getConversation(convoId)) {
      addToConversation(convoId, newMsgs);
      convo = getConversation(convoId);
    } else {
      convoId = startConversation(newMsgs);
      convo = getConversation(convoId);
    }

    // If no history yet, prompt them to ask something
    if (convo.length === 0) {
      const message = await chatAssistant([{
        role: 'user',
        content: 'The user submitted an empty prompt. Ask them to provide a question about Solana.',
      }]);
      addToConversation(convoId, [{ role: 'assistant', content: message }]);
      return reply.send({ conversationId: convoId, message });
    }

    const lastPrompt = convo[convo.length - 1].content;

    try {
      // —— 1️⃣ Transfer‐intent detection
      const transferIntent = await parseTransferIntent(lastPrompt);
      if (transferIntent) {
        const confirmationMessage = generateConfirmationMessage(transferIntent);
        addToConversation(convoId, [{ role: 'assistant', content: confirmationMessage }]);
        return reply.send({
          conversationId: convoId,
          action: 'transfer',
          transferIntent,
          message: confirmationMessage,
        });
      }

      // —— 2️⃣ Fallback to LLM/SQL handlers
      const { action, content } = await chooseEndpoint(convo);

      if (action) {
        switch (action.name) {
          case 'get_balance': {
            const resp = await fastify.inject({
              method: 'GET',
              url: `/balance?address=${encodeURIComponent(action.args.address)}`,
            });
            const data = JSON.parse(resp.payload);
            addToConversation(convoId, [{ role: 'assistant', content: JSON.stringify(data) }]);
            return reply.code(resp.statusCode).send({ conversationId: convoId, ...data });
          }
          case 'get_transaction': {
            const resp = await fastify.inject({
              method: 'GET',
              url: `/transaction?transactionHash=${encodeURIComponent(action.args.transactionHash)}`,
            });
            const data = JSON.parse(resp.payload);
            addToConversation(convoId, [{ role: 'assistant', content: JSON.stringify(data) }]);
            return reply.code(resp.statusCode).send({ conversationId: convoId, ...data });
          }
          case 'get_pnl': {
            const resp = await fastify.inject({
              method: 'GET',
              url: `/pnl?wallet=${encodeURIComponent(action.args.wallet)}`,
            });
            const data = JSON.parse(resp.payload);
            const summary = data.message || `PnL summary for ${action.args.wallet}`;
            addToConversation(convoId, [{ role: 'assistant', content: summary }]);
            return reply.code(resp.statusCode).send({ conversationId: convoId, ...data });
          }
          case 'get_pnl_distribution': {
            const resp = await fastify.inject({
              method: 'GET',
              url: `/pnl-distribution?wallet=${encodeURIComponent(action.args.wallet)}`,
            });
            const data = JSON.parse(resp.payload);
            const summary = data.message || `PnL distribution for ${action.args.wallet}`;
            addToConversation(convoId, [{ role: 'assistant', content: summary }]);
            return reply.code(resp.statusCode).send({ conversationId: convoId, ...data });
          }
        }
      }

      // —— 3️⃣ Direct content fallback
      if (content && content.trim()) {
        const trimmed = content.trim();
        addToConversation(convoId, [{ role: 'assistant', content: trimmed }]);
        return reply.send({ conversationId: convoId, message: trimmed });
      }

      // —— 4️⃣ SQL fallback
      const { sql } = await askLLM(convo);
      if (!sql || !sql.trim().toLowerCase().startsWith('select')) {
        const message = await chatAssistant([{
          role: 'user',
          content: `I couldn't generate a valid query for: "${lastPrompt}". Please rephrase your request.`,
        }]);
        addToConversation(convoId, [{ role: 'assistant', content: message }]);
        return reply.send({ conversationId: convoId, message });
      }

      let result = await runSafeQuery(sql);
      // If empty, auto‐fetch live balance/tx as needed
      if (Array.isArray(result) && result.length === 0) {
        const lower = sql.toLowerCase();
        if (lower.includes('from wallet_balances')) {
          const match = sql.match(/address\s*=\s*['"]?([^'"\s)]+)['"]?/i);
          if (match) {
            const addr = match[1];
            const resp = await fastify.inject({
              method: 'GET',
              url: `/balance?address=${encodeURIComponent(addr)}`,
            });
            if (resp.statusCode < 300) result = [JSON.parse(resp.payload)];
          }
        } else if (lower.includes('from transactions')) {
          const match = sql.match(/transaction_hash\s*=\s*['"]?([^'"\s)]+)['"]?/i);
          if (match) {
            const tx = match[1];
            const resp = await fastify.inject({
              method: 'GET',
              url: `/transaction?transactionHash=${encodeURIComponent(tx)}`,
            });
            if (resp.statusCode < 300) result = [JSON.parse(resp.payload)];
          }
        }
      }

      const responseMessage = JSON.stringify(result, null, 2);
      addToConversation(convoId, [{ role: 'assistant', content: responseMessage }]);
      return reply.send({ conversationId: convoId, message: responseMessage });
    } catch (err) {
      fastify.log.error(err);
      const message = await chatAssistant([{
        role: 'user',
        content: `An error occurred: ${err.message}`,
      }]);
      addToConversation(convoId, [{ role: 'assistant', content: message }]);
      return reply.code(500).send({ conversationId: convoId, message });
    }
  });
}

module.exports = nlpRoute;
