# PactDa Contract Service

This service provides a clean, refactored implementation for interacting with PactDa smart contracts on the Sui blockchain.

## Key Features

1. **Simplified Contract Creation**

   - Proper parameter formatting for Sui Move contracts
   - Correct handling of Option types and vector<u8> serialization
   - Validation of inputs to prevent common errors

2. **Improved Transaction Handling**

   - Uses transaction digest to reliably retrieve created object IDs
   - Robust error handling with meaningful messages
   - Clean code without unnecessary console logs

3. **Contract Retrieval**
   - Functions to get contracts by owner
   - Functions to get contract details by IDs

## Usage Example

```typescript
// Create a new contract transaction
const txb = buildCreateContractTx(
  'License Agreement', // title
  '0x123...def', // optional party B address
  1, // optional contract type
  'Terms of service...', // optional terms reference
  1715817600, // optional start date timestamp
  1731628800, // optional end date timestamp
  'Additional data...', // optional metadata
)

// Execute the transaction
const result = await signAndExecuteTransaction({ transaction: txb })

// Get the created contract ID from the transaction digest
const contractId = await getContractIdFromDigest(suiClient, result.digest)
```

## Improvements Made

1. **Fixed BCS Serialization**: Properly formatted parameters for Move contract interaction

   - Terms reference field: Properly encoded as Option<vector<u8>>
   - Party B address: Properly encoded as Option<address>
   - Contract type: Properly encoded as Option<u8>
   - Metadata: Properly encoded as Option<vector<u8>>

2. **Improved Object ID Retrieval**: Using transaction digest instead of parsing response effects

   - More reliable extraction of created contract IDs
   - Handles both contract creation events and created objects
   - Provides meaningful error messages if extraction fails

3. **Code Quality**

   - Removed unnecessary console.log statements
   - Better error handling with specific error messages
   - Follows TypeScript best practices
   - Single responsibility for each function

4. **Environment Variable Handling**
   - Uses fallbacks to handle different environment variable naming conventions
   - Maintains compatibility with existing code
