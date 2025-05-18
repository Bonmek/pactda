import { useWallet } from '@solana/wallet-adapter-react';
import type { PactContract } from './types';

interface Props {
  contracts: PactContract[];
  onSign: (id: string) => void;
  loading?: {[key: string]: boolean};
}

export function SolanaSignContract({ contracts, onSign, loading = {} }: Props) {
  const { publicKey } = useWallet();

  // Get contracts that are ready for signing by this wallet
  const signableContracts = contracts.filter(c => 
    // For cross-chain contracts, we check partyBAddress (the Solana address)
    // Either the address matches directly or show contracts with stubs where this wallet matches
    ((c.partyBAddress === publicKey?.toBase58() || c.solPartyB === publicKey?.toBase58()) || !c.partyBAddress) && 
    // Must have a stub created
    c.solStubCreated && 
    // And not already signed
    !c.solSigned
  );

  return (
    <div style={{ marginTop: 20 }}>
      <h2>Sign Contract (Solana Party B)</h2>
      
      {!publicKey && (
        <div style={{
          color: 'red', 
          padding: '8px 12px', 
          backgroundColor: '#ffeeee', 
          borderRadius: 4,
          marginBottom: 16
        }}>
          Please connect your Solana wallet to sign contracts
        </div>
      )}
      
      {publicKey && signableContracts.length === 0 && (
        <div style={{ color: '#666', fontStyle: 'italic' }}>
          No contracts available for you to sign.
          {contracts.some(c => c.solStubCreated) ? 
            ' You might not be the designated Party B for any contracts.' : 
            ' Create a Solana stub for a contract first.'}
        </div>
      )}
      
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {signableContracts.map(c => (
          <li key={c.id} style={{ 
            marginBottom: 12, 
            padding: 12, 
            border: '1px solid #eaeaea', 
            borderRadius: 6,
            backgroundColor: '#f6f8ff'
          }}>
            <div style={{ marginBottom: 8 }}>
              <strong>Contract ID:</strong> {c.id}
              {c.title && <div><strong>Title:</strong> {c.title}</div>}
              {c.solanaStubId && <div><strong>Stub ID:</strong> {c.solanaStubId}</div>}
            </div>
              <button 
              onClick={() => onSign(c.id)}
              disabled={loading[c.id]}
              style={{
                padding: '6px 12px',
                backgroundColor: loading[c.id] ? '#aaa' : '#4a58d0',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: loading[c.id] ? 'not-allowed' : 'pointer'
              }}
            >
              {loading[c.id] ? 'Signing...' : 'Sign Contract'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
