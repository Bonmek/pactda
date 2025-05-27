# zkLogin Support in PactDA

This document describes how zkLogin support has been added to the PactDA application, enabling users to create and interact with contracts using social login methods (Google, Facebook) instead of requiring a crypto wallet.

## Overview

The zkLogin implementation allows users to:
1. Log in with Google or Facebook accounts
2. Create contracts using their zkLogin identity
3. Sign and interact with contracts
4. View contract details

## Implementation Details

### Core Components

1. **SuiZkLoginService.ts**
   - Handles zkLogin authentication with Google/Facebook
   - Manages ephemeral keys and randomness
   - Stores and retrieves zkLogin session data
   - Derives zkLogin addresses

2. **ZkLoginTransactionService.ts**
   - Provides functionality to sign and execute transactions with zkLogin
   - Creates zkLogin signatures using the stored credentials
   - Interacts with Mysten Labs' zkLogin prover service

3. **useUnifiedTransaction.ts**
   - A React hook that unifies transaction handling for both regular wallets and zkLogin
   - Automatically detects the appropriate signing method

4. **AuthContext.tsx**
   - Manages authentication state
   - Provides access to the zkLogin address
   - Handles login/logout functionality

### Flow for Contract Creation with zkLogin

1. **Authentication**
   - User clicks Google/Facebook zkLogin button in the header
   - User authenticates with the chosen provider
   - A JWT token is obtained and processed by the Callback component
   - A zkLogin address is derived using the JWT and a salt obtained from the backend
   - The zkLogin address is stored in session storage

2. **Contract Creation**
   - User fills out the contract creation form
   - When submitting, the `buildCreateContractTx` function creates a transaction block
   - The `useUnifiedTransaction` hook detects the user is logged in via zkLogin
   - The transaction is signed using the zkLogin credentials:
     - Ephemeral key signs the transaction block
     - ZkLogin proof is obtained from the prover service
     - A full zkLogin signature is created and submitted

3. **Contract Interaction**
   - All contract actions (sign, approve, dispute, etc.) use the same unified transaction flow
   - The appropriate signing method is selected based on authentication type

## Usage Examples

### Signing a Contract with zkLogin

```tsx
import { useUnifiedTransaction } from '@/hooks/useUnifiedTransaction'
import { buildSignContractAsPartyATx } from '@/service/PactdaService'

function SignContract({ contractId }) {
  const { executeTransaction } = useUnifiedTransaction()
  
  const handleSign = async () => {
    const txb = buildSignContractAsPartyATx(contractId)
    
    try {
      // This will automatically use zkLogin if the user is authenticated that way
      const result = await executeTransaction(txb)
      console.log('Contract signed successfully:', result)
    } catch (error) {
      console.error('Failed to sign contract:', error)
    }
  }
  
  return (
    <button onClick={handleSign}>
      Sign Contract
    </button>
  )
}
```

### Creating a Contract with zkLogin

```tsx
import { useUnifiedTransaction } from '@/hooks/useUnifiedTransaction'
import { buildCreateContractTx } from '@/service/PactdaService'

function CreateContract() {
  const { executeTransaction } = useUnifiedTransaction()
  
  const handleCreateContract = async () => {
    const txb = buildCreateContractTx(
      'My Contract Title', 
      '0x123...', // Party B address
      1, // Contract type
      'Terms of the agreement', 
      Date.now() / 1000, // Start date (timestamp)
      (Date.now() / 1000) + 2592000, // End date (30 days from now)
      'Additional metadata'
    )
    
    try {
      const result = await executeTransaction(txb)
      console.log('Contract created successfully:', result)
    } catch (error) {
      console.error('Failed to create contract:', error)
    }
  }
  
  return (
    <button onClick={handleCreateContract}>
      Create Contract
    </button>
  )
}
```

## Security Considerations

- Session storage is used for the zkLogin credentials, which means they are cleared when the browser session ends
- The ephemeral key is generated for each login session
- Salt values from the backend ensure address consistency between logins
