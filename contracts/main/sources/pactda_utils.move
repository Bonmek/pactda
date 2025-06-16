module pactda::pactda_utils {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use pactda::pactda::{Self, PactDaContract, Escrow};

    // Constants for status
    const ESCROW_STATUS_RELEASED: u8 = 1;
    const ESCROW_STATUS_REFUNDED: u8 = 2;
    const CONTRACT_STATUS_COMPLETED: u8 = 4;

    public entry fun release_milestone_payment(
        contract: &mut PactDaContract,
        escrow: &mut Escrow,
        amount: u64,
        ctx: &mut TxContext
    ) {
        pactda::release_payment(contract, escrow, ctx);
        
    }

    public entry fun process_refund(
        contract: &mut PactDaContract,
        escrow: &mut Escrow,
        amount: u64,
        ctx: &mut TxContext
    ) {
        pactda::refund_payment(contract, escrow, ctx);
    }
}
