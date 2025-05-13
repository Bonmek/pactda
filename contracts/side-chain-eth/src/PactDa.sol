// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PactDa
 * @dev Implements agreement system with escrow, milestone tracking and verification
 * Compatible with the Sui Move implementation for cross-chain integration
 */
contract PactDa {
    // Direct counters instead of using the Counters library
    uint256 private _contractIdCounter;
    uint256 private _escrowIdCounter;
    uint256 private _vcnftIdCounter;

    // Status codes
    enum ContractStatus { PENDING, ACTIVE, DISPUTED, COMPLETED, CANCELLED }
    enum EscrowStatus { FUNDED, RELEASED, REFUNDED, LOCKED }
    enum MilestoneStatus { PENDING, SUBMITTED, APPROVED, DISPUTED }
    
    // Structs
    struct Milestone {
        uint64 id;
        string description;
        uint256 value;
        MilestoneStatus status;
        bytes proofReference;
    }
    
    struct PactDaContract {
        uint256 id;
        ContractStatus status;
        address partyA;
        address partyB;
        bytes termsReference;
        uint256 escrowId;
        bool hasEscrow;
        Milestone[] milestones;
        bool partyASigned;
        bool partyBSigned;
        uint256 createdAt;
    }
    
    struct Escrow {
        uint256 id;
        uint256 contractId;
        uint256 balance;
        address token;
        address payer;
        address payee;
        EscrowStatus status;
    }
    
    struct VCNFT {
        uint256 id;
        address owner;
        uint8 typeId;
        bool isActive;
        string[] specializationTags;
    }
    
    struct ContractReceipt {
        uint256 id;
        uint256 contractId;
        string actionType;
        uint256 timestamp;
    }
    
    // Events
    event ContractCreated(
        uint256 indexed contractId,
        address indexed partyA,
        address indexed partyB
    );
    
    event ContractSigned(
        uint256 indexed contractId,
        address indexed signer
    );
    
    event EscrowFunded(
        uint256 indexed escrowId,
        uint256 indexed contractId,
        uint256 amount,
        address indexed payer
    );
    
    event PaymentReleased(
        uint256 indexed escrowId,
        uint256 indexed contractId,
        uint256 amount,
        address indexed payee
    );
    
    event PaymentRefunded(
        uint256 indexed escrowId,
        uint256 indexed contractId,
        uint256 amount,
        address indexed payer
    );
    
    event MilestoneSubmitted(
        uint256 indexed contractId,
        uint64 indexed milestoneId,
        address indexed submitter
    );
    
    event MilestoneApproved(
        uint256 indexed contractId,
        uint64 indexed milestoneId,
        address indexed approver
    );

    // Data storage
    mapping(uint256 => PactDaContract) private _contracts;
    mapping(uint256 => Escrow) private _escrows;
    mapping(uint256 => VCNFT) private _vcnfts;
    mapping(uint256 => ContractReceipt[]) private _receipts;
    
    // Contract Creation and Management
    function createContract(address partyB, bytes calldata termsReference) external returns (uint256) {
        address partyA = msg.sender;
        
        _contractIdCounter++;
        uint256 newContractId = _contractIdCounter;
        
        PactDaContract storage newContract = _contracts[newContractId];
        newContract.id = newContractId;
        newContract.status = ContractStatus.PENDING;
        newContract.partyA = partyA;
        newContract.partyB = partyB;
        newContract.termsReference = termsReference;
        newContract.hasEscrow = false;
        newContract.partyASigned = false;
        newContract.partyBSigned = false;
        newContract.createdAt = block.timestamp;
        
        emit ContractCreated(newContractId, partyA, partyB);
        
        _createReceipt(newContractId, "contract_created");
        
        return newContractId;
    }
    
    function addMilestones(uint256 contractId, string[] calldata descriptions, uint256[] calldata values) external {
        require(descriptions.length == values.length, "Description and value arrays must have same length");
        require(descriptions.length > 0, "Must provide at least one milestone");
        
        PactDaContract storage pactContract = _contracts[contractId];
        
        require(msg.sender == pactContract.partyA || msg.sender == pactContract.partyB, "Only contract parties can add milestones");
        require(pactContract.status == ContractStatus.PENDING, "Contract must be pending to add milestones");
        
        uint64 startingId = uint64(pactContract.milestones.length);
        
        for (uint64 i = 0; i < descriptions.length; i++) {
            pactContract.milestones.push(
                Milestone({
                    id: startingId + i,
                    description: descriptions[i],
                    value: values[i],
                    status: MilestoneStatus.PENDING,
                    proofReference: bytes("")
                })
            );
        }
        
        _createReceipt(contractId, "milestones_added");
    }
    
    function signContractPartyA(uint256 contractId) external {
        PactDaContract storage pactContract = _contracts[contractId];
        
        require(msg.sender == pactContract.partyA, "Only party A can sign as party A");
        require(pactContract.status == ContractStatus.PENDING, "Contract must be pending to sign");
        require(!pactContract.partyASigned, "Party A has already signed");
        
        pactContract.partyASigned = true;
        
        if (pactContract.partyASigned && pactContract.partyBSigned) {
            pactContract.status = ContractStatus.ACTIVE;
        }
        
        emit ContractSigned(contractId, msg.sender);
        
        _createReceipt(contractId, "contract_signed_by_a");
    }
    
    function signContractPartyB(uint256 contractId) external {
        PactDaContract storage pactContract = _contracts[contractId];
        
        require(msg.sender == pactContract.partyB, "Only party B can sign as party B");
        require(pactContract.status == ContractStatus.PENDING, "Contract must be pending to sign");
        require(!pactContract.partyBSigned, "Party B has already signed");
        
        pactContract.partyBSigned = true;
        
        if (pactContract.partyASigned && pactContract.partyBSigned) {
            pactContract.status = ContractStatus.ACTIVE;
        }
        
        emit ContractSigned(contractId, msg.sender);
        
        _createReceipt(contractId, "contract_signed_by_b");
    }
    
    // Escrow Management
    function fundEscrow(uint256 contractId) external payable {
        PactDaContract storage pactContract = _contracts[contractId];
        
        require(pactContract.status == ContractStatus.ACTIVE, "Contract must be active to fund escrow");
        require(msg.sender == pactContract.partyA || msg.sender == pactContract.partyB, "Only contract parties can fund escrow");
        require(!pactContract.hasEscrow, "Contract already has an escrow");
        
        address payer = msg.sender;
        address payee = (payer == pactContract.partyA) ? pactContract.partyB : pactContract.partyA;
        
        _escrowIdCounter++;
        uint256 newEscrowId = _escrowIdCounter;
        
        Escrow storage newEscrow = _escrows[newEscrowId];
        newEscrow.id = newEscrowId;
        newEscrow.contractId = contractId;
        newEscrow.balance = msg.value;
        newEscrow.token = address(0); // Native ETH
        newEscrow.payer = payer;
        newEscrow.payee = payee;
        newEscrow.status = EscrowStatus.FUNDED;
        
        pactContract.escrowId = newEscrowId;
        pactContract.hasEscrow = true;
        
        emit EscrowFunded(newEscrowId, contractId, msg.value, payer);
        
        _createReceipt(contractId, "escrow_funded");
    }

    function fundEscrowWithToken(uint256 contractId, address token, uint256 amount) external {
        PactDaContract storage pactContract = _contracts[contractId];
        
        require(pactContract.status == ContractStatus.ACTIVE, "Contract must be active to fund escrow");
        require(msg.sender == pactContract.partyA || msg.sender == pactContract.partyB, "Only contract parties can fund escrow");
        require(!pactContract.hasEscrow, "Contract already has an escrow");
        
        address payer = msg.sender;
        address payee = (payer == pactContract.partyA) ? pactContract.partyB : pactContract.partyA;
        
        // Transfer tokens from sender to contract
        IERC20(token).transferFrom(payer, address(this), amount);
        
        _escrowIdCounter++;
        uint256 newEscrowId = _escrowIdCounter;
        
        Escrow storage newEscrow = _escrows[newEscrowId];
        newEscrow.id = newEscrowId;
        newEscrow.contractId = contractId;
        newEscrow.balance = amount;
        newEscrow.token = token;
        newEscrow.payer = payer;
        newEscrow.payee = payee;
        newEscrow.status = EscrowStatus.FUNDED;
        
        pactContract.escrowId = newEscrowId;
        pactContract.hasEscrow = true;
        
        emit EscrowFunded(newEscrowId, contractId, amount, payer);
        
        _createReceipt(contractId, "escrow_funded");
    }
    
    function releasePayment(uint256 contractId) external {
        PactDaContract storage pactContract = _contracts[contractId];
        
        require(pactContract.hasEscrow, "Contract has no escrow");
        
        Escrow storage escrow = _escrows[pactContract.escrowId];
        
        require(msg.sender == escrow.payer, "Only the payer can release funds");
        require(escrow.status == EscrowStatus.FUNDED, "Escrow must be in funded status");
        
        uint256 amount = escrow.balance;
        escrow.balance = 0;
        escrow.status = EscrowStatus.RELEASED;
        
        // Transfer funds to payee
        if (escrow.token == address(0)) {
            // Native ETH
            payable(escrow.payee).transfer(amount);
        } else {
            // ERC20 token
            IERC20(escrow.token).transfer(escrow.payee, amount);
        }
        
        emit PaymentReleased(escrow.id, contractId, amount, escrow.payee);
        
        // Check if all milestones are approved
        if (pactContract.milestones.length > 0) {
            bool allCompleted = true;
            for (uint i = 0; i < pactContract.milestones.length; i++) {
                if (pactContract.milestones[i].status != MilestoneStatus.APPROVED) {
                    allCompleted = false;
                    break;
                }
            }
            
            if (allCompleted) {
                pactContract.status = ContractStatus.COMPLETED;
            }
        } else {
            // No milestones, mark contract as completed
            pactContract.status = ContractStatus.COMPLETED;
        }
        
        _createReceipt(contractId, "payment_released");
    }
    
    function refundPayment(uint256 contractId) external {
        PactDaContract storage pactContract = _contracts[contractId];
        
        require(pactContract.hasEscrow, "Contract has no escrow");
        
        Escrow storage escrow = _escrows[pactContract.escrowId];
        
        require(msg.sender == escrow.payee, "Only the payee can agree to refund");
        require(escrow.status == EscrowStatus.FUNDED, "Escrow must be in funded status");
        
        uint256 amount = escrow.balance;
        escrow.balance = 0;
        escrow.status = EscrowStatus.REFUNDED;
        
        // Transfer funds back to payer
        if (escrow.token == address(0)) {
            // Native ETH
            payable(escrow.payer).transfer(amount);
        } else {
            // ERC20 token
            IERC20(escrow.token).transfer(escrow.payer, amount);
        }
        
        emit PaymentRefunded(escrow.id, contractId, amount, escrow.payer);
        
        _createReceipt(contractId, "payment_refunded");
    }
    
    // Milestone Management
    function submitProof(uint256 contractId, uint64 milestoneId, bytes calldata proofReference) external {
        PactDaContract storage pactContract = _contracts[contractId];
        
        require(pactContract.status == ContractStatus.ACTIVE, "Contract must be active to submit proof");
        require(msg.sender == pactContract.partyB, "Only party B can submit proof");
        require(milestoneId < pactContract.milestones.length, "Invalid milestone ID");
        
        Milestone storage milestone = pactContract.milestones[milestoneId];
        require(milestone.status == MilestoneStatus.PENDING, "Milestone must be pending to submit proof");
        
        milestone.status = MilestoneStatus.SUBMITTED;
        milestone.proofReference = proofReference;
        
        emit MilestoneSubmitted(contractId, milestoneId, msg.sender);
        
        _createReceipt(contractId, "proof_submitted");
    }
    
    function approveMilestone(uint256 contractId, uint64 milestoneId) external {
        PactDaContract storage pactContract = _contracts[contractId];
        
        require(pactContract.status == ContractStatus.ACTIVE, "Contract must be active to approve milestone");
        require(msg.sender == pactContract.partyA, "Only party A can approve milestone");
        require(milestoneId < pactContract.milestones.length, "Invalid milestone ID");
        
        Milestone storage milestone = pactContract.milestones[milestoneId];
        require(milestone.status == MilestoneStatus.SUBMITTED, "Milestone must be submitted to be approved");
        
        milestone.status = MilestoneStatus.APPROVED;
        
        emit MilestoneApproved(contractId, milestoneId, msg.sender);
        
        _createReceipt(contractId, "milestone_approved");
    }
    
    // VCNFT Management
    function createVcnft(uint8 typeId, string[] calldata specializationTags) external returns (uint256) {
        _vcnftIdCounter++;
        uint256 newVcnftId = _vcnftIdCounter;
        
        VCNFT storage newVcnft = _vcnfts[newVcnftId];
        newVcnft.id = newVcnftId;
        newVcnft.owner = msg.sender;
        newVcnft.typeId = typeId;
        newVcnft.isActive = true;
        
        for (uint i = 0; i < specializationTags.length; i++) {
            newVcnft.specializationTags.push(specializationTags[i]);
        }
        
        return newVcnftId;
    }
    
    // Helper functions
    function _createReceipt(uint256 contractId, string memory actionType) internal {
        ContractReceipt memory receipt = ContractReceipt({
            id: _receipts[contractId].length,
            contractId: contractId,
            actionType: actionType,
            timestamp: block.timestamp
        });
        
        _receipts[contractId].push(receipt);
    }
    
    // View functions
    function getContractDetails(uint256 contractId) external view returns (
        ContractStatus status,
        address partyA,
        address partyB,
        bool hasEscrow,
        uint256 escrowId,
        uint256 milestoneCount,
        bool partyASigned,
        bool partyBSigned
    ) {
        PactDaContract storage pactContract = _contracts[contractId];
        return (
            pactContract.status,
            pactContract.partyA,
            pactContract.partyB,
            pactContract.hasEscrow,
            pactContract.escrowId,
            pactContract.milestones.length,
            pactContract.partyASigned,
            pactContract.partyBSigned
        );
    }
    
    function getMilestone(uint256 contractId, uint64 milestoneId) external view returns (
        string memory description,
        uint256 value,
        MilestoneStatus status,
        bytes memory proofReference
    ) {
        PactDaContract storage pactContract = _contracts[contractId];
        require(milestoneId < pactContract.milestones.length, "Invalid milestone ID");
        
        Milestone storage milestone = pactContract.milestones[milestoneId];
        return (
            milestone.description,
            milestone.value,
            milestone.status,
            milestone.proofReference
        );
    }
    
    function getEscrowDetails(uint256 escrowId) external view returns (
        uint256 contractId,
        uint256 balance,
        address token,
        address payer,
        address payee,
        EscrowStatus status
    ) {
        Escrow storage escrow = _escrows[escrowId];
        return (
            escrow.contractId,
            escrow.balance,
            escrow.token,
            escrow.payer,
            escrow.payee,
            escrow.status
        );
    }
    
    function getVcnftDetails(uint256 vcnftId) external view returns (
        address owner,
        uint8 typeId,
        bool isActive,
        uint256 specializationTagCount
    ) {
        VCNFT storage vcnft = _vcnfts[vcnftId];
        return (
            vcnft.owner,
            vcnft.typeId,
            vcnft.isActive,
            vcnft.specializationTags.length
        );
    }
    
    function getVcnftSpecializationTag(uint256 vcnftId, uint256 tagIndex) external view returns (string memory) {
        VCNFT storage vcnft = _vcnfts[vcnftId];
        require(tagIndex < vcnft.specializationTags.length, "Invalid tag index");
        return vcnft.specializationTags[tagIndex];
    }
    
    function isMilestoneSubmitted(uint256 contractId, uint64 milestoneId) external view returns (bool) {
        PactDaContract storage pactContract = _contracts[contractId];
        
        if (milestoneId >= pactContract.milestones.length) {
            return false;
        }
        
        return pactContract.milestones[milestoneId].status == MilestoneStatus.SUBMITTED;
    }
    
    function isMilestoneApproved(uint256 contractId, uint64 milestoneId) external view returns (bool) {
        PactDaContract storage pactContract = _contracts[contractId];
        
        if (milestoneId >= pactContract.milestones.length) {
            return false;
        }
        
        return pactContract.milestones[milestoneId].status == MilestoneStatus.APPROVED;
    }
}