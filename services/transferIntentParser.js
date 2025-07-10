// services/transferIntentParser.js

/**
 * Parses a natural‐language prompt for a SOL‐transfer intent.
 * Recognizes patterns like "send 0.5 SOL to <ADDRESS>" (case‐insensitive).
 * @param {string} text
 * @returns {{ amount: number, recipientAddress: string } | null}
 */
function parseTransferIntent(text) {
  const regex = /send\s+([0-9]+(?:\.[0-9]+)?)\s*sol\s+to\s+([A-Za-z0-9]+)/i;
  const match = text.match(regex);
  if (match) {
    const amount = parseFloat(match[1]);
    const recipientAddress = match[2];
    return { amount, recipientAddress };
  }
  return null;
}

/**
 * Builds the assistant’s confirmation prompt once a transfer intent is detected.
 * @param {{ amount: number, recipientAddress: string }} intent
 * @returns {string}
 */
function generateConfirmationMessage({ amount, recipientAddress }) {
  return `Please confirm: send ${amount} SOL to ${recipientAddress}? Reply 'yes' to confirm or 'no' to cancel.`;
}

module.exports = {
  parseTransferIntent,
  generateConfirmationMessage,
};
