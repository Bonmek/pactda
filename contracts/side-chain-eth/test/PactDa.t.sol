// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/PactDa.sol";

contract PactDaTest is Test {
    PactDa public pactda;
    address public partyA;
    address public partyB;

    function setUp() public {
        pactda = new PactDa();
        partyA = address(this);
        partyB = address(0x2);
        vm.label(partyA, "Party A");
        vm.label(partyB, "Party B");
    }

    function testCreateContract() public {
        bytes memory termsReference = bytes("ipfs://QmTermsReference");
        uint256 contractId = pactda.createContract(partyB, termsReference);
        
        assertEq(contractId, 1, "First contract ID should be 1");
        
        (
            PactDa.ContractStatus status,
            address contractPartyA,
            address contractPartyB,
            bool hasEscrow,
            ,
            ,
            bool partyASigned,
            bool partyBSigned
        ) = pactda.getContractDetails(contractId);
        
        assertEq(uint(status), uint(PactDa.ContractStatus.PENDING), "Contract should be in PENDING status");
        assertEq(contractPartyA, partyA, "Party A should be the contract creator");
        assertEq(contractPartyB, partyB, "Party B should be the specified address");
        assertEq(hasEscrow, false, "Contract should not have escrow initially");
        assertEq(partyASigned, false, "Party A should not be signed initially");
        assertEq(partyBSigned, false, "Party B should not be signed initially");
    }

    function testSigningContract() public {
        bytes memory termsReference = bytes("ipfs://QmTermsReference");
        uint256 contractId = pactda.createContract(partyB, termsReference);
        
        // Party A signs
        pactda.signContractPartyA(contractId);
        
        // Party B signs
        vm.prank(partyB);
        pactda.signContractPartyB(contractId);
        
        // Check contract status after both signed
        (
            PactDa.ContractStatus status,
            ,
            ,
            ,
            ,
            ,
            bool partyASigned,
            bool partyBSigned
        ) = pactda.getContractDetails(contractId);
        
        assertEq(uint(status), uint(PactDa.ContractStatus.ACTIVE), "Contract should be ACTIVE after both parties sign");
        assertEq(partyASigned, true, "Party A should be signed");
        assertEq(partyBSigned, true, "Party B should be signed");
    }
}