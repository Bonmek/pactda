# PactDa Contract Creation Fixes

This document describes the fixes implemented to resolve the "InvalidBCSBytes" errors occurring when creating Sui contracts through the frontend interface.

## Issues Fixed

The following fields were causing "InvalidBCSBytes" errors during contract creation:

1. **Terms Reference** - Option<vector<u8>> encoding issues
2. **Party B Address** - Address format and Option<address> encoding issues  
3. **Contract Type** - Option<u8> encoding issues
4. **Metadata** - Option<vector<u8>> encoding issues

## Implementation Changes

### 1. Created `PactdaServiceFixedV2.ts`

The new service file correctly implements the `buildCreateContractTx` function with proper serialization for Move contract parameters:

- Correctly uses `txb.pure.option()` for Option types instead of vectors
- Properly encodes vector<u8> fields (terms reference and metadata)
- Uses proper BigInt for u64 timestamps
- More robust error handling and debugging

### 2. Updated `CreateSuiContract.tsx` 

- Now imports from the V2 fixed service
- Added stronger input validation
- Improved error messages for specific BCS serialization issues
- Added safeguards against non-ASCII characters
- Added warnings in the UI about known limitations

### 3. Environment Variable Alignment

- Fixed environment variable references to ensure consistency
- Added additional logging to help diagnose configuration issues

## Key Technical Changes

1. **Option Types**: Changed from using vectors to proper Option types, e.g.:
   ```typescript
   // Before (incorrect)
   args.push(txb.pure.vector('address', [txb.pure.address(partyBAddress)]));
   
   // After (correct)
   args.push(txb.pure.option('address', partyBAddress));
   ```

2. **Vector<u8> Encoding**: Properly encode string data as byte arrays:
   ```typescript
   // Convert string to bytes
   const bytes = new TextEncoder().encode(termsReference);
   // Create a vector of raw bytes
   const bytesVector = Array.from(bytes);
   // Create Option::Some(vector<u8>)
   args.push(txb.pure.option('vector<u8>', bytesVector));
   ```

3. **Input Validation**: Added client-side validation to prevent invalid inputs:
   ```typescript
   if (termsReference && /[^\x00-\x7F]/.test(termsReference)) {
     setError("Terms Reference contains non-ASCII characters that may cause errors");
     return;
   }
   ```

4. **Error Handling**: Enhanced error messages to guide users when errors occur:
   ```typescript
   if (e.message && e.message.includes('InvalidBCSBytes')) {
     errorMessage += 'Invalid data format for BCS serialization...';
     // Specific guidance based on which field is problematic
   }
   ```

## Testing

To test these fixes:
1. Create a new contract with simple ASCII text in the Terms Reference and Metadata fields
2. Try with a valid Party B address format (0x followed by 64 hex characters) or leave it empty
3. Use a simple number between 0-255 for Contract Type, or leave it empty

## Known Limitations

- Non-ASCII characters in text fields may still cause BCS serialization issues
- Complex or very long strings may not encode properly
