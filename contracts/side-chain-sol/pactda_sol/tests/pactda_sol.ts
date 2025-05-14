import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { PactdaSol } from "../target/types/pactda_sol";
import { Keypair, SystemProgram, PublicKey } from "@solana/web3.js";
import { expect } from "chai";
import { randomBytes } from "crypto";

// Wormhole Core Bridge Program ID on Solana
const WORMHOLE_BRIDGE_ADDRESS = new PublicKey(
  "worm2ZoG2kUd4vFXhvjh93UUH596ayRfgQ2MgjNMTth"
);

describe("pactda_sol", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PactdaSol as Program<PactdaSol>;
  const signerUser = provider.wallet.publicKey; // The user performing direct actions or paying for VAA processing
  const relayer = Keypair.generate(); // Simulate a relayer for VAA-based instructions

  before(async () => {
    // Airdrop SOL to the relayer so it can pay for transactions
    const airdropSignature = await provider.connection.requestAirdrop(
      relayer.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL // Airdrop 2 SOL
    );
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        signature: airdropSignature,
    });
    console.log(`Airdropped SOL to relayer ${relayer.publicKey.toBase58()}`);
  });


  describe("Direct Interactions (User-initiated)", () => {
    it("Initializes a PactDaSolStub directly", async () => {
      const solanaStubId = new BN(101);
      const suiContractIdentifier = "sui_contract_direct_001";
      const title = "Direct Test Pact Title";
      const description = "Direct Test Pact Description";
      const pactdaUrl = "https://example.com/direct/pact/1";

      const [pactDaStubPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("pactda_stub_v1"),
          signerUser.toBuffer(),
          solanaStubId.toBuffer("le", 8),
        ],
        program.programId
      );

      await program.methods
        .initializeStubDirect(
          solanaStubId,
          suiContractIdentifier,
          title,
          description,
          pactdaUrl
        )
        .accounts({
          pactDaStub: pactDaStubPda, // Already camelCase, but confirming
          signer: signerUser,
          systemProgram: SystemProgram.programId, // Already camelCase
        })
        .rpc();

      const stubAccount = await program.account.pactDaSolStub.fetch( // This refers to the account type, should be correct
        pactDaStubPda
      );

      expect(stubAccount.initiator.toString()).to.equal(signerUser.toString());
      expect(stubAccount.solanaStubId.toString()).to.equal(solanaStubId.toString());
      expect(stubAccount.suiContractIdentifier).to.equal(suiContractIdentifier);
      expect(stubAccount.title).to.equal(title);
      expect(stubAccount.description).to.equal(description);
      expect(stubAccount.pactdaUrl).to.equal(pactdaUrl);
      expect(stubAccount.displayStatus).to.equal("Initialized on Solana (Direct)");
      expect(stubAccount.termsReference).to.be.null;
      expect(stubAccount.contractStartDate).to.be.null;
      expect(stubAccount.contractDeadlineDate).to.be.null;
      expect(stubAccount.metadata).to.be.null;
      expect(stubAccount.contractType).to.be.null;
    });

    it("Requests an action on Sui", async () => {
      const solanaStubId = new BN(102); 
      const suiContractIdentifier = "sui_contract_direct_002_req_action";
      const title = "Direct Action Request Title";
      const description = "Direct Action Request Desc";
      const pactdaUrl = "https://example.com/direct/pact/2";
      
      const [pactDaStubPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("pactda_stub_v1"),
          signerUser.toBuffer(),
          solanaStubId.toBuffer("le", 8),
        ],
        program.programId
      );

      await program.methods
        .initializeStubDirect(
          solanaStubId,
          suiContractIdentifier,
          title,
          description,
          pactdaUrl
        )
        .accounts({
          pactDaStub: pactDaStubPda,
          signer: signerUser,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      
      const actionTypeForSui = 10; // sui_actions::SIGN_CONTRACT
      const actionSpecificPayloadBytes = Buffer.from(randomBytes(32)); // Mock payload
      const targetSuiBridgeAddressBytes = randomBytes(32);

      let listenerId = null;
      const eventPromise = new Promise((resolve) => {
        listenerId = program.addEventListener("actionToSuiRequested", (event, _slot) => { // Corrected event name
          resolve(event);
        });
      });
      
      await program.methods
        .requestActionOnSui(
          solanaStubId,
          actionTypeForSui,
          actionSpecificPayloadBytes, 
          Array.from(targetSuiBridgeAddressBytes)
        )
        .accounts({
          pactDaStub: pactDaStubPda,
          signer: signerUser,
        })
        .rpc();

      const event: any = await eventPromise;
      if (listenerId) await program.removeEventListener(listenerId);

      expect(event.solanaStubId.toString()).to.equal(solanaStubId.toString());
      expect(event.initiatorOnSolana.toString()).to.equal(signerUser.toString());
      expect(event.actionTypeForSui).to.equal(actionTypeForSui);
      expect(Buffer.from(event.fullActionPayloadForSui)).to.exist; // Further deserialization would be needed for deep check
      expect(event.targetChainId).to.equal(21); // TARGET_CHAIN_SUI
      expect(Buffer.from(event.targetSuiBridgeAddress).toString('hex')).to.equal(targetSuiBridgeAddressBytes.toString('hex'));
    });
  });


  describe("VAA-based Interactions (Simulating Sui -> Solana)", () => {
    // Helper to generate a VAA hash and its corresponding wormhole_message PDA
    const getWormholeMessagePda = (vaaHashBuffer: Buffer) => {
      return PublicKey.findProgramAddressSync(
        [Buffer.from("postedVAA"), vaaHashBuffer],
        WORMHOLE_BRIDGE_ADDRESS
      )[0];
    };
    
    it("Fails to process VAA with generic handler (deprecated)", async () => {
      const vaaHash = randomBytes(32);
      const vaaPayloadSolanaStubId = new BN(199); 
      const dummyInitiator = Keypair.generate().publicKey;

      const [pactDaStubPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("pactda_stub_v1"),
          dummyInitiator.toBuffer(),
          vaaPayloadSolanaStubId.toBuffer("le", 8),
        ],
        program.programId
      );
      
      const wormholeMessagePda = getWormholeMessagePda(vaaHash);

      try {
        await program.methods
          .processVaaFromSui(
            Array.from(vaaHash), 
            vaaPayloadSolanaStubId
          )
          .accounts({
            payer: relayer.publicKey, 
            wormholeBridge: WORMHOLE_BRIDGE_ADDRESS,
            wormholeMessage: wormholeMessagePda,
            pactDaStub: pactDaStubPda, 
            systemProgram: SystemProgram.programId,
          })
          .signers([relayer]) 
          .rpc();
        expect.fail("Transaction should have failed due to account not being initialized.");
      } catch (error) {
        expect(error.message).to.contain("AccountNotInitialized");
        // Anchor wraps the error, so we check the string message.
        // For more precise error code checking, you might need to inspect error.error properties.
        
      }
    });

    it("Initializes a PactDaSolStub from a VAA", async () => {
      const vaaHash = randomBytes(32);
      const targetSolanaStubId = new BN(201);
      const suiContractIdentifier = "sui_contract_vaa_001";
      const title = "VAA Test Pact Title";
      const description = "VAA Test Pact Description";
      const pactdaUrl = "https://example.com/vaa/pact/1";
      const partyBSolanaAddress = Keypair.generate().publicKey; // This will be the initiator

      // Optional fields
      const termsReference = "Ref: VAA Terms v1";
      const contractStartDate = new BN(Math.floor(Date.now() / 1000));
      const contractDeadlineDate = new BN(Math.floor(Date.now() / 1000) + 86400 * 30); // 30 days later
      const metadata = JSON.stringify({ vaaSource: "Sui", version: "1.0" });
      const contractType = 1; // Example type

      const [pactDaStubPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("pactda_stub_v1"),
          partyBSolanaAddress.toBuffer(), // Initiator is partyBSolanaAddress from VAA
          targetSolanaStubId.toBuffer("le", 8),
        ],
        program.programId
      );
      const wormholeMessagePda = getWormholeMessagePda(vaaHash);

      await program.methods
        .initializeStubFromVaa(
          Array.from(vaaHash),
          targetSolanaStubId,
          suiContractIdentifier,
          title,
          description,
          pactdaUrl,
          partyBSolanaAddress,
          termsReference,
          contractStartDate,
          contractDeadlineDate,
          metadata,
          contractType
        )
        .accounts({
          shared: {
            payer: relayer.publicKey,
            wormholeBridge: WORMHOLE_BRIDGE_ADDRESS, // This was the source of one error type
          },
          wormholeMessage: wormholeMessagePda,
          pactDaStub: pactDaStubPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([relayer])
        .rpc();

      const stubAccount = await program.account.pactDaSolStub.fetch(pactDaStubPda);
      expect(stubAccount.initiator.toString()).to.equal(partyBSolanaAddress.toString());
      expect(stubAccount.solanaStubId.toString()).to.equal(targetSolanaStubId.toString());
      expect(stubAccount.suiContractIdentifier).to.equal(suiContractIdentifier);
      expect(stubAccount.title).to.equal(title);
      expect(stubAccount.description).to.equal(description);
      expect(stubAccount.pactdaUrl).to.equal(pactdaUrl);
      expect(stubAccount.displayStatus).to.equal("Initialized from Sui VAA");
      expect(stubAccount.termsReference).to.equal(termsReference);
      expect(stubAccount.contractStartDate.toString()).to.equal(contractStartDate.toString());
      expect(stubAccount.contractDeadlineDate.toString()).to.equal(contractDeadlineDate.toString());
      expect(stubAccount.metadata).to.equal(metadata);
      expect(stubAccount.contractType).to.equal(contractType);
    });

    it("Updates stub status from a VAA", async () => {
      // 1. Initialize a stub directly first (or use one from a previous test if state is managed)
      const solanaStubIdToUpdate = new BN(202);
      const originalInitiator = signerUser; // Stub initiated by signerUser
      const suiContractIdForUpdate = "sui_update_status_001";

      const [pactDaStubPdaToUpdate] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("pactda_stub_v1"),
          originalInitiator.toBuffer(),
          solanaStubIdToUpdate.toBuffer("le", 8),
        ],
        program.programId
      );

      await program.methods
        .initializeStubDirect(
          solanaStubIdToUpdate,
          suiContractIdForUpdate,
          "Status Update Title",
          "Status Update Desc",
          "https://example.com/status_update"
        )
        .accounts({
          pactDaStub: pactDaStubPdaToUpdate,
          signer: signerUser,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      
      // 2. Now update its status via VAA
      const vaaHashForStatusUpdate = randomBytes(32);
      const newDisplayStatus = "Contract Active (from VAA)";
      const wormholeMessagePdaForStatus = getWormholeMessagePda(vaaHashForStatusUpdate);

      await program.methods
        .updateStubStatusFromVaa(
          Array.from(vaaHashForStatusUpdate),
          solanaStubIdToUpdate, // target_solana_stub_id
          newDisplayStatus
        )
        .accounts({
          shared: {
            payer: relayer.publicKey,
            wormholeBridge: WORMHOLE_BRIDGE_ADDRESS,
          },
          wormholeMessage: wormholeMessagePdaForStatus,
          pactDaStub: pactDaStubPdaToUpdate, 
        })
        .signers([relayer])
        .rpc();

      const updatedStubAccount = await program.account.pactDaSolStub.fetch(pactDaStubPdaToUpdate);
      expect(updatedStubAccount.displayStatus).to.equal(newDisplayStatus);
      expect(updatedStubAccount.solanaStubId.toString()).to.equal(solanaStubIdToUpdate.toString());
    });

    it("Updates stub details from a VAA", async () => {
      // 1. Initialize a stub
      const solanaStubIdToDetailUpdate = new BN(203);
      const originalInitiatorDetails = signerUser;
      const suiContractIdForDetailUpdate = "sui_detail_update_001";

      const [pactDaStubPdaToDetailUpdate] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("pactda_stub_v1"),
          originalInitiatorDetails.toBuffer(),
          solanaStubIdToDetailUpdate.toBuffer("le", 8),
        ],
        program.programId
      );

      await program.methods
        .initializeStubDirect(
          solanaStubIdToDetailUpdate,
          suiContractIdForDetailUpdate,
          "Initial Detail Title",
          "Initial Detail Desc",
          "https://example.com/initial_details"
        )
        .accounts({
          pactDaStub: pactDaStubPdaToDetailUpdate,
          signer: signerUser,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // 2. Update details via VAA
      const vaaHashForDetailUpdate = randomBytes(32);
      const wormholeMessagePdaForDetails = getWormholeMessagePda(vaaHashForDetailUpdate);

      const newTitle = "Updated Title (VAA)";
      const newTermsRef = "Updated Terms Ref v2 (VAA)";
      const newStartDate = new BN(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now
      const newDeadlineDate = new BN(Math.floor(Date.now() / 1000) + 86400 * 60); // 60 days
      const newMetadata = JSON.stringify({ updateSource: "Sui VAA", version: "2.0" });
      const newContractType = 2;

      await program.methods
        .updateStubDetailsFromVaa(
          Array.from(vaaHashForDetailUpdate),
          solanaStubIdToDetailUpdate, // target_solana_stub_id
          newTitle,
          newTermsRef,
          newStartDate,
          newDeadlineDate,
          newMetadata,
          newContractType
        )
        .accounts({
          shared: {
            payer: relayer.publicKey,
            wormholeBridge: WORMHOLE_BRIDGE_ADDRESS,
          },
          wormholeMessage: wormholeMessagePdaForDetails,
          pactDaStub: pactDaStubPdaToDetailUpdate,
        })
        .signers([relayer])
        .rpc();

      const detailedStubAccount = await program.account.pactDaSolStub.fetch(pactDaStubPdaToDetailUpdate);
      expect(detailedStubAccount.title).to.equal(newTitle);
      expect(detailedStubAccount.termsReference).to.equal(newTermsRef);
      expect(detailedStubAccount.contractStartDate.toString()).to.equal(newStartDate.toString());
      expect(detailedStubAccount.contractDeadlineDate.toString()).to.equal(newDeadlineDate.toString());
      expect(detailedStubAccount.metadata).to.equal(newMetadata);
      expect(detailedStubAccount.contractType).to.equal(newContractType);
      // Ensure non-updated fields (like description, pactdaUrl) remain from initializeStubDirect
      expect(detailedStubAccount.description).to.equal("Initial Detail Desc"); 
    });
  });
});
