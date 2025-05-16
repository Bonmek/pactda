import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { useState } from 'react';
import type { PactContract } from './types';
// Use the consolidated PactDa contract service
import { buildCreateContractTx } from '../../frontend/src/service/PactDaContractService';

interface Props {
  onCreate: (contract: PactContract) => void;
}

export function CreateSuiContract({ onCreate }: Props) {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();

  const [title, setTitle] = useState(''); // String
  const [suiPartyBAddress, setSuiPartyBAddress] = useState(''); // Option<address>
  const [contractType, setContractType] = useState<number | undefined>(undefined); // Option<u8>
  const [termsReference, setTermsReference] = useState(''); // Option<vector<u8>> 
  const [startDate, setStartDate] = useState<string>(''); // Option<u64> 
  const [endDate, setEndDate] = useState<string>(''); // Option<u64> 
  const [metadata, setMetadata] = useState(''); // Option<vector<u8>>
  
  const [solanaPartyBAddress, setSolanaPartyBAddress] = useState(''); 


  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    try {
      if (!currentAccount) {
        setError("Please connect your Sui wallet.");
        return;
      }
      if (!title.trim()) {
        setError("Title is required.");
        return;
      }
      // Validate suiPartyBAddress if provided
      if (suiPartyBAddress && suiPartyBAddress.trim() !== '' && !/^0x[a-fA-F0-9]{64}$/.test(suiPartyBAddress)) {
          setError("Party B's Sui Address is invalid. It must be a 64-character hex string starting with 0x, or left empty.");
          return;
      }
      // Validate contractType if provided
      if (contractType !== undefined && (contractType < 0 || contractType > 255)) {
          setError("Contract Type must be a number between 0 and 255, or left empty.");
          return;
      }
      
      // Validate termsReference for potential BCS serialization issues
      if (termsReference && termsReference.trim() !== '') {
          // Check for non-ASCII characters or control characters that might cause BCS serialization issues
          if (/[^\x00-\x7F]/.test(termsReference)) {
              setError("Terms Reference contains non-ASCII characters that may cause errors. Please use only ASCII characters.");
              return;
          }
          if (termsReference.length > 1000) {
              setError("Terms Reference is too long. Please keep it under 1000 characters.");
              return;
          }
      }
      
      // Validate metadata for potential BCS serialization issues
      if (metadata && metadata.trim() !== '') {
          // Check for non-ASCII characters or control characters that might cause BCS serialization issues
          if (/[^\x00-\x7F]/.test(metadata)) {
              setError("Metadata contains non-ASCII characters that may cause errors. Please use only ASCII characters.");
              return;
          }
          if (metadata.length > 1000) {
              setError("Metadata is too long. Please keep it under 1000 characters.");
              return;
          }
      }

      // Convert date strings to timestamps (u64)
      const startDateTimestamp = startDate ? Math.floor(new Date(startDate).getTime() / 1000) : undefined;
      const endDateTimestamp = endDate ? Math.floor(new Date(endDate).getTime() / 1000) : undefined;

      if (startDateTimestamp && isNaN(startDateTimestamp)) {
          setError("Invalid Start Date.");
          return;
      }
      if (endDateTimestamp && isNaN(endDateTimestamp)) {
          setError("Invalid End Date.");
          return;
      }
      if (startDateTimestamp && endDateTimestamp && startDateTimestamp >= endDateTimestamp) {
          setError("Start Date must be before End Date.");
          return;
      }

      setLoading(true);
      setError(null);

      // Handle empty strings correctly by converting to undefined
      const cleanPartyBAddress = suiPartyBAddress && suiPartyBAddress.trim() !== '' ? suiPartyBAddress : undefined;
      const cleanTermsReference = termsReference && termsReference.trim() !== '' ? termsReference : undefined;
      const cleanMetadata = metadata && metadata.trim() !== '' ? metadata : undefined;        // Check for potentially problematic inputs
      if (cleanTermsReference && /[^\x20-\x7E]/.test(cleanTermsReference)) {
        setError('Terms reference contains non-printable or special characters which may cause encoding issues. Please use simple text only.');
        setLoading(false);
        return;
      }
      
      if (cleanMetadata && /[^\x20-\x7E]/.test(cleanMetadata)) {
        setError('Metadata contains non-printable or special characters which may cause encoding issues. Please use simple text only.');
        setLoading(false);
        return;
      }
      
      // Build the transaction
      const txb = buildCreateContractTx(
        title,
        cleanPartyBAddress,
        contractType,
        cleanTermsReference,
        startDateTimestamp,
        endDateTimestamp,
        cleanMetadata
      );
        
        // Execute the transaction
        const result = await signAndExecuteTransaction({ transaction: txb });
        
        // Get the transaction digest
        if (!result.digest) {
          setError('Transaction succeeded but no digest was returned');
          setLoading(false);
          return;
        }

        const txn = await suiClient.waitForTransaction({
          digest: result.digest,
          options: {
            showEffects: true,
          }
        })
        let  createdObjectId = '';
      
        // Use the digest to find the contract object ID
        if (txn.effects && txn.effects.created && txn.effects?.created?.length > 0) {
        createdObjectId = txn.effects?.created[0]?.reference.objectId;
        console.log('Created object ID:', createdObjectId);
      }
        

      const newContract: PactContract = {
        id: createdObjectId,
        title: title,
        partyAAddress: currentAccount.address,
        // Storing the inputs as they were entered, or after processing for timestamps
        suiPartyBAddress: suiPartyBAddress || undefined,
        partyBAddress: solanaPartyBAddress || undefined, // For the cross-chain aspect
        contractType: contractType,
        termsReference: termsReference || undefined,
        startDate: startDateTimestamp,
        endDate: endDateTimestamp,
        metadata: metadata || undefined,
        pactdaUrl: '', // Placeholder or derive if possible
        status: 'Created on Sui', // Initial status
      };
      onCreate(newContract);
      
      // Reset form
      setTitle('');
      setSuiPartyBAddress('');
      setSolanaPartyBAddress('');
      setContractType(undefined);
      setTermsReference('');
      setStartDate('');
      setEndDate('');
      setMetadata('');
    } catch (e: any) {
      // Provide concise but helpful error messages
      let errorMessage = 'Failed to create contract: ';
      
      if (e.message && e.message.includes('ValiError')) {
        // Handle validation error case
        if (e.message.includes('0x') && (e.message.includes('undefined') || e.message.includes('Invalid'))) {
          errorMessage += 'Invalid Party B address format. Please use a valid 0x-prefixed address or leave it empty.';
        } else {
          errorMessage += 'Input validation failed: ' + e.message;
        }
      } else if (e.message && e.message.includes('InvalidBCSBytes')) {
        // Handle BCS serialization errors
        if (termsReference && termsReference.trim() !== '' && e.message.includes('terms')) {
          errorMessage += 'The Terms Reference field contains invalid characters. Try using plain text only.';
        } else if (metadata && metadata.trim() !== '' && e.message.includes('metadata')) {
          errorMessage += 'The Metadata field contains invalid characters. Try using plain text only.';
        } else if (suiPartyBAddress && suiPartyBAddress.trim() !== '') {
          errorMessage += 'The Party B address might be incorrectly formatted. Make sure it begins with 0x and contains 64 valid hex characters.';
        } else if (contractType !== undefined && e.message.includes('contract_type')) {
          errorMessage += 'The Contract Type value is invalid. It must be a number between 0 and 255.';
        } else {
          errorMessage += 'Input format error. Try simplifying or removing special characters from text fields.';
        }
      } else if (e.message) {
        errorMessage += e.message;
      } else {
        errorMessage += 'An unexpected error occurred.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Create New PactDa Contract (Sui)</h2>
      <div>
        <label>Title: <input type="text" value={title} onChange={e => setTitle(e.target.value)} required /></label>
      </div>
      <div>
        <label>Terms Reference/Description: <textarea value={termsReference} onChange={e => setTermsReference(e.target.value)} /></label>
        <small> (Use plain ASCII text only. If empty, contract uses default. <b>Known issue:</b> Complex characters may cause errors.)</small>
      </div>
      <div>
        <label>Party B (Sui Address - Optional): <input type="text" value={suiPartyBAddress} onChange={e => setSuiPartyBAddress(e.target.value)} placeholder="0x... (Sui Address)" /></label>
        <small> (Must be a valid 64-character Sui address starting with 0x or left completely empty. If empty, contract uses default @0x0.)</small>
      </div>
       <div>
        <label>Party B (Solana Address - for cross-chain PoC): <input type="text" value={solanaPartyBAddress} onChange={e => setSolanaPartyBAddress(e.target.value)} placeholder="Solana Base58 Address" /></label>
      </div>
      <div>
        <label>Contract Type (Optional Number 0-255): <input type="number" min="0" max="255" value={contractType === undefined ? '' : contractType} onChange={e => setContractType(e.target.value === '' ? undefined : parseInt(e.target.value))} placeholder="e.g., 0" /></label>
        <small> (Must be a number between 0-255. If empty, contract uses default 0.)</small>
      </div>
      <div>
        <label>Start Date (Optional): <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} /></label>
      </div>
      <div>
        <label>End/Deadline Date (Optional): <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} /></label>
      </div>
      <div>
        <label>Metadata (Optional Text): <textarea value={metadata} onChange={e => setMetadata(e.target.value)} /></label>
        <small> (Use plain ASCII text only. <b>Known issue:</b> Complex characters may cause errors.)</small>
      </div>
      
      <button onClick={handleCreate} disabled={loading || !currentAccount || !title.trim()}>
        {loading ? 'Creating...' : 'Create Contract on Sui'}
      </button>
      {!currentAccount && <div style={{color:'red'}}>Please connect your Sui wallet.</div>}
      {error && <div style={{color:'red', marginTop: '10px'}}>{error}</div>}
    </div>
  );
}