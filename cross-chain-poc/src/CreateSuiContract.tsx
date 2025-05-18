import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { useWallet as useSolanaWallet } from "@solana/wallet-adapter-react";
import { useState, ReactElement } from "react";
import type { PactContract } from "./types";
// Use our local PactDa contract service for cross-chain functionality
import {
  buildCreateContractTx,
  buildCreateCrossChainContractTx,
} from "./service/PactDaContractService";
import {
  getWormholeChainId,
  formatSolanaAddress,
} from "./service/WalletService";

interface Props {
  onCreate: (contract: PactContract) => void;
}

export function CreateSuiContract({ onCreate }: Props) {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signAndExecuteTransaction } =
    useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const solanaWallet = useSolanaWallet();

  const [title, setTitle] = useState(""); // String
  const [suiPartyBAddress, setSuiPartyBAddress] = useState(""); // Option<address>
  const [contractType, setContractType] = useState<number | undefined>(
    undefined
  ); // Option<u8>
  const [termsReference, setTermsReference] = useState(""); // Option<vector<u8>>
  const [startDate, setStartDate] = useState<string>(""); // Option<u64>
  const [endDate, setEndDate] = useState<string>(""); // Option<u64>
  const [metadata, setMetadata] = useState(""); // Option<vector<u8>>

  const [solanaPartyBAddress, setSolanaPartyBAddress] = useState<
    string | undefined
  >(""); // Updated type
  // Add a state for crosschain mode
  const [isCrossChain, setIsCrossChain] = useState(false);

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

      // For cross-chain, require Solana wallet and address
      if (isCrossChain) {
        if (!solanaWallet.publicKey) {
          setError(
            "For cross-chain contracts, please connect your Solana wallet."
          );
          return;
        }
        if (!solanaPartyBAddress && !solanaWallet.publicKey) {
          setSolanaPartyBAddress(solanaWallet.publicKey.toString());
        }
      } else {
        // Regular Sui contract validation
        // Validate suiPartyBAddress if provided
        if (
          suiPartyBAddress &&
          suiPartyBAddress.trim() !== "" &&
          !/^0x[a-fA-F0-9]{64}$/.test(suiPartyBAddress)
        ) {
          setError(
            "Party B's Sui Address is invalid. It must be a 64-character hex string starting with 0x, or left empty."
          );
          return;
        }
      }

      // Common validations for both contract types
      // Validate contractType if provided
      if (
        contractType !== undefined &&
        (contractType < 0 || contractType > 255)
      ) {
        setError(
          "Contract Type must be a number between 0 and 255, or left empty."
        );
        return;
      }

      // Validate termsReference for potential BCS serialization issues
      if (termsReference && termsReference.trim() !== "") {
        // Check for non-ASCII characters or control characters that might cause BCS serialization issues
        if (/[^ -~]/.test(termsReference)) {
          setError(
            "Terms Reference contains non-ASCII characters that may cause errors. Please use only ASCII characters."
          );
          return;
        }
        if (termsReference.length > 1000) {
          setError(
            "Terms Reference is too long. Please keep it under 1000 characters."
          );
          return;
        }
      }

      // Validate metadata for potential BCS serialization issues
      if (metadata && metadata.trim() !== "") {
        // Check for non-ASCII characters or control characters that might cause BCS serialization issues
        if (/[^ -~]/.test(metadata)) {
          setError(
            "Metadata contains non-ASCII characters that may cause errors. Please use only ASCII characters."
          );
          return;
        }
        if (metadata.length > 1000) {
          setError(
            "Metadata is too long. Please keep it under 1000 characters."
          );
          return;
        }
      } // Convert date strings to timestamps (u64)
      const startDateTimestamp = startDate
        ? Math.floor(new Date(startDate).getTime() / 1000)
        : undefined;
      const endDateTimestamp = endDate
        ? Math.floor(new Date(endDate).getTime() / 1000)
        : undefined;

      if (startDateTimestamp && isNaN(startDateTimestamp)) {
        setError("Invalid Start Date.");
        return;
      }
      if (endDateTimestamp && isNaN(endDateTimestamp)) {
        setError("Invalid End Date.");
        return;
      }
      if (
        startDateTimestamp &&
        endDateTimestamp &&
        startDateTimestamp >= endDateTimestamp
      ) {
        setError("Start Date must be before End Date.");
        return;
      }

      setLoading(true);
      setError(null);

      // Handle empty strings correctly by converting to undefined
      const cleanPartyBAddress =
        suiPartyBAddress && suiPartyBAddress.trim() !== ""
          ? suiPartyBAddress
          : undefined;
      const cleanTermsReference =
        termsReference && termsReference.trim() !== ""
          ? termsReference
          : undefined;
      const cleanMetadata =
        metadata && metadata.trim() !== "" ? metadata : undefined;

      // Check for potentially problematic inputs
      if (cleanTermsReference && /[^ -~]/.test(cleanTermsReference)) {
        setError(
          "Terms reference contains non-printable or special characters which may cause encoding issues. Please use simple text only."
        );
        setLoading(false);
        return;
      }

      if (cleanMetadata && /[^ -~]/.test(cleanMetadata)) {
        setError(
          "Metadata contains non-printable or special characters which may cause encoding issues. Please use simple text only."
        );
        setLoading(false);
        return;
      }

      try {
        // Choose between cross-chain or regular contract creation
        let txb;
        if (isCrossChain) {
          // Get Solana party B address
          const solAddress =
            solanaPartyBAddress ||
            (solanaWallet.publicKey ? solanaWallet.publicKey.toString() : "");
          if (!solAddress) {
            setError("Solana address is required for cross-chain contracts.");
            setLoading(false);
            return;
          }

          console.log(
            "Creating cross-chain contract with Solana party B:",
            solAddress
          );

          // Create cross-chain contract with Solana party B
          txb = buildCreateCrossChainContractTx(
            title,
            getWormholeChainId("solana"), // For Solana
            solAddress,
            contractType,
            cleanTermsReference,
            startDateTimestamp,
            endDateTimestamp,
            cleanMetadata
          );
        } else {
          // Create regular Sui contract
          txb = buildCreateContractTx(
            title,
            cleanPartyBAddress,
            contractType,
            cleanTermsReference,
            startDateTimestamp,
            endDateTimestamp,
            cleanMetadata
          );
        }

        // Execute the transaction
        const result = await signAndExecuteTransaction({ transaction: txb });

        // Get the transaction digest
        if (!result.digest) {
          setError("Transaction succeeded but no digest was returned");
          setLoading(false);
          return;
        }

        const txn = await suiClient.waitForTransaction({
          digest: result.digest,
          options: {
            showEffects: true,
          },
        });
        let createdObjectId = "";

        // Use the digest to find the contract object ID
        if (
          txn.effects &&
          txn.effects.created &&
          txn.effects?.created?.length > 0
        ) {
          createdObjectId = txn.effects?.created[0]?.reference.objectId;
        }

        // Create the contract object with cross-chain status
        const newContract: PactContract = {
          id: createdObjectId,
          title: title,
          partyAAddress: currentAccount.address,
          suiPartyBAddress: !isCrossChain
            ? suiPartyBAddress || undefined
            : undefined,
          partyBAddress: isCrossChain
            ? solanaPartyBAddress ||
              (solanaWallet.publicKey
                ? solanaWallet.publicKey.toString()
                : undefined)
            : undefined,
          contractType: contractType,
          termsReference: termsReference || undefined,
          startDate: startDateTimestamp,
          endDate: endDateTimestamp,
          metadata: metadata || undefined,
          pactdaUrl: "",
          status: isCrossChain
            ? "Cross-chain contract created on Sui"
            : "Created on Sui",
          solStubCreated: false,
          solSigned: false,
        };
        onCreate(newContract);

        // Reset form
        setTitle("");
        setSuiPartyBAddress("");
        setSolanaPartyBAddress("");
        setContractType(undefined);
        setTermsReference("");
        setStartDate("");
        setEndDate("");
        setMetadata("");
      } catch (e: unknown) {
        // Updated type
        let errorMessage = "Failed to create contract: ";
        if (e instanceof Error) {
          errorMessage += e.message;
        } else {
          errorMessage += "An unexpected error occurred.";
        }      setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Create New PactDa Contract</h2>

      {/* Cross-Chain Toggle Switch */}
      <div
        className="toggle-container"
        style={{
          margin: "10px 0",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <label>
          <input
            type="checkbox"
            checked={isCrossChain}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setIsCrossChain(e.target.checked)
            }
          />
          Enable Cross-Chain Mode (Sui ↔ Solana)
        </label>
        {isCrossChain && !solanaWallet.connected && (
          <span style={{ color: "orange", fontSize: "0.9em" }}>
            You need to connect your Solana wallet for cross-chain contracts
          </span>
        )}
      </div>

      {/* Contract Details */}
      <div>
        <label>
          Title:{" "}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>
      </div>
      <div>
        <label>
          Terms Reference/Description:{" "}
          <textarea
            value={termsReference}
            onChange={(e) => setTermsReference(e.target.value)}
          />
        </label>
        <small>
          {" "}
          (Use plain ASCII text only. If empty, contract uses default.{" "}
          <b>Known issue:</b> Complex characters may cause errors.)
        </small>
      </div>

      {/* Party B Address Section - conditionally shown based on cross-chain mode */}
      {!isCrossChain ? (
        <div>
          <label>
            Party B (Sui Address - Optional):{" "}
            <input
              type="text"
              value={suiPartyBAddress}
              onChange={(e) => setSuiPartyBAddress(e.target.value)}
              placeholder="0x... (Sui Address)"
            />
          </label>
          <small>
            {" "}
            (Must be a valid 64-character Sui address starting with 0x or left
            completely empty. If empty, contract uses default @0x0.)
          </small>
        </div>
      ) : (
        <div>
          <label>
            Party B (Solana Address):
            <input
              type="text"
              value={
                solanaPartyBAddress ||
                (solanaWallet.publicKey
                  ? solanaWallet.publicKey.toString()
                  : "")
              }
              onChange={(e) => setSolanaPartyBAddress(e.target.value)}
              placeholder="Solana Base58 Address"
              disabled={!!solanaWallet.publicKey}
            />
          </label>
          <small>
            {solanaWallet.connected
              ? `Using connected Solana wallet: ${formatSolanaAddress(
                  solanaWallet.publicKey!.toString()
                )}`
              : "Please connect your Solana wallet for cross-chain contracts."}
          </small>
        </div>
      )}

      {/* Common Contract Fields */}
      <div>
        <label>
          Contract Type (Optional Number 0-255):{" "}
          <input
            type="number"
            min="0"
            max="255"
            value={contractType === undefined ? "" : contractType}
            onChange={(e) =>
              setContractType(
                e.target.value === "" ? undefined : parseInt(e.target.value)
              )
            }
            placeholder="e.g., 0"
          />
        </label>
        <small>
          {" "}
          (Must be a number between 0-255. If empty, contract uses default 0.)
        </small>
      </div>
      <div>
        <label>
          Start Date (Optional):{" "}
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>
      </div>
      <div>
        <label>
          End/Deadline Date (Optional):{" "}
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>
      </div>
      <div>
        <label>
          Metadata (Optional Text):{" "}
          <textarea
            value={metadata}
            onChange={(e) => setMetadata(e.target.value)}
          />
        </label>
        <small>
          {" "}
          (Use plain ASCII text only. <b>Known issue:</b> Complex characters
          may cause errors.)
        </small>
      </div>

      {/* Create Button with dynamic label based on mode */}
      <button
        onClick={handleCreate}
        disabled={
          loading ||
          !currentAccount ||
          !title.trim() ||
          (isCrossChain && !solanaWallet.connected)
        }
        style={{
          backgroundColor: isCrossChain ? "#6c5ce7" : "#2980b9",
          color: "white",
          border: "none",
          padding: "10px 15px",
          borderRadius: "5px",
          cursor:
            loading ||
            !currentAccount ||
            !title.trim() ||
            (isCrossChain && !solanaWallet.connected)
              ? "not-allowed"
              : "pointer",
          opacity:
            loading ||
            !currentAccount ||
            !title.trim() ||
            (isCrossChain && !solanaWallet.connected)
              ? 0.6
              : 1,
        }}
      >
        {loading
          ? "Creating..."
          : isCrossChain
          ? "Create Cross-Chain Contract"
          : "Create Contract on Sui"}
      </button>

      {/* Error Messages */}
      {!currentAccount && (
        <div style={{ color: "red" }}>Please connect your Sui wallet.</div>
      )}
      {isCrossChain && !solanaWallet.connected && (
        <div style={{ color: "red" }}>
          Please connect your Solana wallet for cross-chain contracts.
        </div>
      )}
      {error && (
        <div style={{ color: "red", marginTop: "10px" }}>{error}</div>
      )}
    </div>
  );
}
