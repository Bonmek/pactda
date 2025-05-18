// This is a CommonJS wrapper for the SolanaServiceFixed module
const { createSponsoredSolanaStub, createSolanaStub, signContractOnSolana, PACTDA_PROGRAM_ID, PACTDA_PROGRAM_ID_STRING } = require('../dist/src/service/SolanaServiceFixed.js');

module.exports = {
  createSponsoredSolanaStub,
  createSolanaStub,
  signContractOnSolana,
  PACTDA_PROGRAM_ID,
  PACTDA_PROGRAM_ID_STRING
};
