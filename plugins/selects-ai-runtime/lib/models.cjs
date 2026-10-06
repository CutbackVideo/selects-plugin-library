'use strict';
const fs = require('node:fs');
const crypto = require('node:crypto');

function requirePinnedModel(model) {
  if (!model || typeof model.path !== 'string' || !/^[a-f0-9]{64}$/.test(model.sha256 ?? '')) throw new Error('Expected a pinned model path and SHA-256');
}

async function verifyModel(model) {
  requirePinnedModel(model);
  const digest = crypto.createHash('sha256');
  for await (const bytes of fs.createReadStream(model.path)) digest.update(bytes);
  if (digest.digest('hex') !== model.sha256) throw new Error('Model checksum mismatch');
}

async function loadVerifiedModelBytes(model) {
  requirePinnedModel(model);
  const bytes = await fs.promises.readFile(model.path);
  if (crypto.createHash('sha256').update(bytes).digest('hex') !== model.sha256) throw new Error('Model checksum mismatch');
  return bytes;
}

async function createVerifiedModelSession(ort, model, options) {
  // Node supports Windows long paths; ORT's native file loader does not always.
  // Hash the same bytes given to ORT so a later file replacement cannot bypass the pin.
  return ort.InferenceSession.create(await loadVerifiedModelBytes(model), options);
}

module.exports = { verifyModel, loadVerifiedModelBytes, createVerifiedModelSession };
