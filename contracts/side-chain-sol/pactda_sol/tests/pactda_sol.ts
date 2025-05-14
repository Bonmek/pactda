import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { PactdaSol } from "../target/types/pactda_sol";
import { Keypair, SystemProgram, PublicKey } from "@solana/web3.js";
import { expect } from "chai"; // Import expect from chai

describe("pactda_sol", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PactdaSol as Program<PactdaSol>;
  const signer = provider.wallet as anchor.Wallet;

  // Generate a new keypair for Party B for testing purposes
  const partyBKeypair = Keypair.generate();
  // Airdrop some SOL to Party B for potential future transactions if needed
  // (not strictly necessary for being a payee, but good practice for testing)
  // provider.connection.requestAirdrop(partyBKeypair.publicKey, 1 * anchor.web3.LAMPORTS_PER_SOL);

  it("Is initialized!", async () => {
    const contractId = new BN(1); // Example ID

    // Derive the PDA for the PactDaContract account
    const [pactDaContractPDA, _bump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("pactda"),
        signer.publicKey.toBuffer(),
        contractId.toArrayLike(Buffer, "le", 8), // u64 as little-endian bytes
      ],
      program.programId
    );

    const termsReference = Buffer.from("sample_terms_hash_or_ipfs_cid");
    const milestones = null; // Or an empty array: []
    const crossChainParties = null; // Or an empty array: []

    try {
      const tx = await program.methods
        .initializeContract(
          contractId,
          signer.publicKey, // partyA
          partyBKeypair.publicKey, // partyB
          termsReference,
          milestones,
          crossChainParties
        )
        .accounts({
          pactDaContract: pactDaContractPDA, 
          signer: signer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      console.log("InitializeContract transaction signature", tx);

      // Fetch the created account
      const contractAccount = await program.account.pactDaContract.fetch(pactDaContractPDA);
      console.log("Contract Account Data:", contractAccount);

      // Add assertions here to verify the account data
      expect(contractAccount.id.eq(contractId)).to.be.true;
      expect(contractAccount.partyA.equals(signer.publicKey)).to.be.true;
      expect(contractAccount.partyB.equals(partyBKeypair.publicKey)).to.be.true;
      expect(Buffer.from(contractAccount.termsReference).equals(termsReference)).to.be.true;
      // Add more assertions as needed

    } catch (error) {
      console.error("Error during InitializeContract:", error);
      if (error.logs) {
        console.error("Program Logs:", error.logs);
      }
      throw error;
    }
  });

  // Add more tests for other instructions (fund_escrow, approve_work_or_milestone, etc.)
  // For example, a test for fund_escrow:
  it("Funds escrow!", async () => {
    const contractId = new BN(1); // Must match the ID used in initialize
    const escrowId = new BN(101); // Example Escrow ID
    const amountToFund = new BN(1 * anchor.web3.LAMPORTS_PER_SOL); // 1 SOL

    // PDA for the PactDaContract (assuming it was initialized in a previous test or setup)
    const [pactDaContractPDA, _contractBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("pactda"),
        signer.publicKey.toBuffer(),
        contractId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    // PDA for the Escrow account
    const [escrowPDA, _escrowBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        pactDaContractPDA.toBuffer(),
        escrowId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    try {
      // Ensure the contract account exists from the previous test
      // If tests are independent, you might need to initialize the contract here as well.
      const contractAccountBeforeFund = await program.account.pactDaContract.fetch(pactDaContractPDA);
      if (!contractAccountBeforeFund) {
        throw new Error("Contract account not found. Run initialize test first or ensure it's setup.");
      }
      console.log("Party B for escrow payee:", contractAccountBeforeFund.partyB.toBase58());

      const tx = await program.methods
        .fundEscrow(escrowId, amountToFund)
        .accounts({
          pactDaContract: pactDaContractPDA, 
          escrow: escrowPDA,
          signer: signer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      console.log("FundEscrow transaction signature", tx);

      // Fetch the created escrow account
      const escrowAccount = await program.account.escrow.fetch(escrowPDA);
      console.log("Escrow Account Data:", escrowAccount);
      expect(escrowAccount.id.eq(escrowId)).to.be.true;
      expect(escrowAccount.balance.eq(amountToFund)).to.be.true;
      expect(escrowAccount.contract.equals(pactDaContractPDA)).to.be.true;
      expect(escrowAccount.payer.equals(signer.publicKey)).to.be.true;
      // The payee is set to contract.party_b in the Rust code
      expect(escrowAccount.payee.equals(contractAccountBeforeFund.partyB)).to.be.true;

      // Verify contract's escrow field is updated
      const contractAccountAfterFund = await program.account.pactDaContract.fetch(pactDaContractPDA);
      expect(contractAccountAfterFund.escrow.equals(escrowPDA)).to.be.true;

    } catch (error) {
      console.error("Error during FundEscrow:", error);
      if (error.logs) {
        console.error("Program Logs:", error.logs);
      }
      throw error;
    }
  });

});
