'use strict';
function throwIfAborted(signal) {
  if (signal?.aborted) {
    const error = new Error('AI job canceled');
    error.code = 'JOB_CANCELED';
    throw error;
  }
}
module.exports = { throwIfAborted };
