// This file contains functions to validate incoming requests, ensuring that required fields are present and correctly formatted.

function validateUserIdentifier(sub) {
    if (!sub || typeof sub !== 'string') {
      return { valid: false, error: 'Invalid user identifier (sub). It must be a non-empty string.' };
    }
    return { valid: true };
  }
  
  function validateIssuer(iss) {
    if (!iss || typeof iss !== 'string') {
      return { valid: false, error: 'Invalid issuer (iss). It must be a non-empty string.' };
    }
    return { valid: true };
  }
  
  function validateRequestBody(body) {
    const { sub, iss } = body;
    const subValidation = validateUserIdentifier(sub);
    const issValidation = validateIssuer(iss);
  
    if (!subValidation.valid) {
      return subValidation;
    }
    if (!issValidation.valid) {
      return issValidation;
    }
    return { valid: true };
  }
  
  module.exports = {
    validateRequestBody,
  };