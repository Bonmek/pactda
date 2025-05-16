import type { PactContract } from './types';

interface Props {
  contracts: PactContract[];
  onCreateSolStub: (id: string) => void;
  loading?: {[key: string]: boolean};
}

export function ContractList({ contracts, onCreateSolStub, loading = {} }: Props) {
  return (
    <div>
      <h2>Contracts</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {contracts.map(c => (
          <li key={c.id} style={{ 
            marginBottom: 16, 
            padding: 16, 
            border: '1px solid #eee', 
            borderRadius: 8,
            backgroundColor: '#f9f9f9'
          }}>
            <div style={{ fontWeight: 'bold', fontSize: '1.1em', marginBottom: 8 }}>
              Contract ID: <span style={{ color: '#4a58d0' }}>{c.id}</span>
            </div>
            
            <div style={{ marginBottom: 12 }}>
              <div>Title: {c.title || 'Untitled Contract'}</div>
              <div>Sui Creator: {c.suiCreator || c.partyAAddress}</div>
              <div>Solana Party B: {c.solPartyB || c.partyBAddress}</div>
              {c.solanaStubId && (
                <div>Solana Stub ID: {c.solanaStubId}</div>
              )}
              {c.status && (
                <div style={{ marginTop: 8 }}>
                  Status: <span style={{ fontStyle: 'italic' }}>{c.status}</span>
                </div>
              )}
              {c.solanaExplorerUrl && (
                <div style={{ marginTop: 4 }}>
                  <a 
                    href={c.solanaExplorerUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#4a58d0', textDecoration: 'underline' }}
                  >
                    View Solana stub transaction
                  </a>
                </div>
              )}
              {c.solanaSignExplorerUrl && (
                <div style={{ marginTop: 4 }}>
                  <a 
                    href={c.solanaSignExplorerUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#4a58d0', textDecoration: 'underline' }}
                  >
                    View Solana sign transaction
                  </a>
                </div>
              )}
            </div>
            
            <div style={{ 
              display: 'flex', 
              flexDirection: 'row', 
              gap: 12, 
              alignItems: 'center',
              marginTop: 8
            }}>
              <div>
                <strong>Solana Stub:</strong> {' '}
                {loading[c.id] ? (
                  <span>Creating stub... ⏳</span>
                ) : c.solStubCreated ? (
                  <span style={{ color: 'green' }}>✅ Created</span>
                ) : (
                  <button 
                    onClick={() => onCreateSolStub(c.id)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#4a58d0',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer'
                    }}
                  >
                    Create on Solana
                  </button>
                )}
              </div>
              <div>
                <strong>Signed:</strong> {' '}
                {c.solSigned ? (
                  <span style={{ color: 'green' }}>✅ Signed</span>
                ) : (
                  <span style={{ color: '#888' }}>❌ Not Signed</span>
                )}
              </div>
            </div>
          </li>
        ))}
        {contracts.length === 0 && (
          <div style={{ padding: 16, color: '#666', fontStyle: 'italic' }}>
            No contracts created yet. Create a contract on Sui first.
          </div>
        )}
      </ul>
    </div>
  );
}
