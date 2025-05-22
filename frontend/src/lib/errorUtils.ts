// frontend/src/lib/errorUtils.ts

// Define a mapping for known error substrings to user-friendly messages
const ERROR_MAP: Record<string, string> = {
  // Contract lifecycle and signing errors
  "EIncorrectParty": "Action can only be performed by the designated party (e.g., Party A or Party B).",
  "EContractNotSignedByPartyA": "Contract must be signed by Party A first.",
  "EContractNotSignedByPartyB": "Contract must be signed by Party B before this action.",
  "EAlreadySigned": "You have already signed this contract.",
  "EContractAlreadySubmitted": "The contract has already been submitted and cannot be modified or signed further in this state.",
  "EInvalidStatus": "The action is not allowed in the current contract status.",
  "EUnauthorized": "You are not authorized to perform this action.", // General authorization
  "ENotParty": "You are not a party to this contract and cannot perform this action.",
  "EContractNotActive": "This action can only be performed on an active contract.",
  "EContractCompleted": "This action cannot be performed as the contract is already completed.",
  "EContractCancelled": "This action cannot be performed as the contract has been cancelled.",

  // Milestone specific errors
  "EMilestoneNotFound": "The specified milestone could not be found.",
  "EMilestoneAlreadyCompleted": "This milestone has already been completed and cannot be modified.",
  "EMilestoneNotYetApproved": "This milestone has not been approved yet.",
  "EMilestoneDescriptionTooLong": "Milestone description is too long.",
  "EMaxMilestonesReached": "Cannot add more milestones; the maximum limit has been reached.",
  "EInvalidMilestoneIndex": "The milestone index provided is invalid.",

  // Payment and funds related errors
  "ENotEnoughFunds": "The contract or milestone does not have sufficient funds for this action.", // Contract-level funds
  "EInvalidAmount": "The amount specified is invalid (e.g., zero, negative, or exceeds limits).",
  "EEscrowNotFunded": "The escrow is not funded for this operation.",
  "EPaymentFailed": "Payment processing failed.",

  // Time and deadline related errors
  "EDeadlinePassed": "The action cannot be performed because the deadline has passed.",
  "EStartDateInPast": "The contract start date cannot be in the past.",
  "EDeadlineBeforeStartDate": "The contract deadline cannot be before its start date.",

  // General and validation errors
  "EInvalidInput": "Invalid input provided. Please check the data and try again.",
  "EValueTooShort": "The provided text or value is too short.", // e.g. for title, terms
  "EValueTooLong": "The provided text or value is too long.",  // e.g. for title, terms, metadata
  "ENoChangesMade": "No changes were detected to update.",
};

// More generic SUI error patterns that might wrap contract errors
const SUI_ERROR_PATTERNS: Record<string, string> = {
  "MoveAbort": "Transaction aborted due to a contract rule violation.", // Generic, specific message should follow
  "FunctionExecutionFailure": "Contract execution failed.", // Generic
  // Add more SUI-specific patterns if they help refine the message before specific mapping
};

/**
 * Maps a raw error message from contract execution to a more user-friendly string.
 * @param errorMessage The raw error message string.
 * @returns A user-friendly error message.
 */
export function mapContractError(errorMessage: string): string {
  if (!errorMessage || typeof errorMessage !== 'string') {
    return "An unexpected error occurred. Please check the console for details.";
  }

  // First, check for specific known error messages from ERROR_MAP
  for (const key in ERROR_MAP) {
    if (errorMessage.includes(key)) {
      return ERROR_MAP[key];
    }
  }

  // If no specific match, check for more generic SUI error patterns
  // This can help make SUI-level errors slightly more understandable if they don't contain specific contract codes
  for (const key in SUI_ERROR_PATTERNS) {
    if (errorMessage.includes(key)) {
      // Attempt to extract a more specific part of the message if possible
      // Example: "MoveAbort(blah, blah, ESomeError(params))" -> extract "ESomeError"
      const matches = errorMessage.match(/EMoveAbort\s*\([^)]*\)\s*in\s*(\w+::\w+::\w+)/);
      if (matches && matches[1]) {
         // This regex is a guess, may need adjustment based on actual error formats
        const suiErrorDetails = errorMessage.substring(errorMessage.indexOf(key));
        return `${SUI_ERROR_PATTERNS[key]} Details: ${suiErrorDetails.substring(0,150)}...`;
      }
      // A more robust regex to find specific error codes like E[A-Z][a-zA-Z]+
      const specificErrorCodeMatch = errorMessage.match(/\b(E[A-Z][a-zA-Z]+)\b/);
      if (specificErrorCodeMatch && ERROR_MAP[specificErrorCodeMatch[1]]) {
        return ERROR_MAP[specificErrorCodeMatch[1]];
      }
      return `${SUI_ERROR_PATTERNS[key]} (Details: ${errorMessage.substring(0, 100)}...)`;
    }
  }
  
  // Fallback for unrecognized errors
  // Sometimes the raw message itself might be somewhat informative, but often it's too cryptic.
  // You might choose to return the original message for unmapped errors if they are sometimes useful.
  // return `An unmapped contract error occurred: ${errorMessage}`;
  return "An unexpected contract error occurred. Please review the details and try again, or contact support if the issue persists. Check console for technical information.";
}
