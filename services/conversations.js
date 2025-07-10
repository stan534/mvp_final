const { randomUUID } = require('crypto');

const store = new Map();

function startConversation(initial = []) {
  const id = randomUUID();
  store.set(id, Array.isArray(initial) ? [...initial] : []);
  return id;
}

function getConversation(id) {
  return store.get(id) || null;
}

function addToConversation(id, messages = []) {
  const convo = store.get(id);
  if (!convo) return false;
  if (Array.isArray(messages)) {
    for (const msg of messages) {
      convo.push(msg);
    }
  }
  return true;
}

module.exports = { startConversation, getConversation, addToConversation };
