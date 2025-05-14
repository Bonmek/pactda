import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { PactdaSol } from "../target/types/pactda_sol";
import { Keypair, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";

describe("pactda_sol_stub_tests", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PactdaSol as Program<PactdaSol>;
  const signer = provider.wallet as anchor.Wallet;

  it("is a placeholder test", () => {
    expect(true).to.be.true;
    console.log("Placeholder test executed.");
  });
});
