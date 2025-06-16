# PactDa - Blockchain-based Agreement Platform

PactDa is a decentralized application (dApp) built on the Sui blockchain that enables users to create, manage, and execute digital agreements with escrow functionality, milestone tracking, and verification capabilities.

## 🌟 Features

- **Smart Contract Agreements**: Create digital contracts between two parties with customizable terms
- **Milestone Management**: Break down agreements into verifiable milestones 
- **Escrow System**: Secure payment handling with conditional releases
- **ZKLogin Authentication**: User-friendly authentication with Zero Knowledge proofs
- **Verification Credentials**: NFT-based verification system for parties

## 🏗️ Project Structure

The project is organized into three main components:

### Smart Contracts (Move)

Located in the `contracts/` directory, the Move smart contracts handle the core business logic:
- Contract creation and management
- Escrow funds handling
- Milestone verification and approval
- VCNFT (Verification Credential NFT) issuance

### Frontend (React)

Located in the `frontend/` directory, built with:
- React with TypeScript
- Vite for fast development
- Modern component architecture
- Client-side routing

### Backend

Located in the `backend/` directory:
- Sui ZKLogin Salt API for authentication
- MongoDB integration for data persistence
- API endpoints for ZKLogin flows

## 🚀 Getting Started

### Prerequisites

- Node.js (v16+)
- pnpm package manager
- Sui CLI and development environment
- MongoDB (for backend services)

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd pactda
   ```

2. Install frontend dependencies:
   ```
   cd frontend
   pnpm install
   ```

3. Install backend dependencies:
   ```
   cd ../backend/sui-zklogin-salt-api
   pnpm install
   ```

4. Build and publish the smart contracts:
   ```
   cd ../contracts/main
   sui move build
   sui client publish --gas-budget 20000000
   ```

### Development

#### Frontend
```
cd frontend
pnpm dev
```

#### Backend
```
cd backend/sui-zklogin-salt-api
pnpm dev
```

## 📝 Contract Usage

The PactDa contract supports the following main functions:

1. **Create Contract**: Establish an agreement between two parties
2. **Add Milestones**: Add verifiable milestones to track progress
3. **Sign Contract**: Both parties must sign to activate
4. **Fund Escrow**: Secure funds in the escrow
5. **Submit Proof**: Document milestone completion
6. **Approve Milestone**: Verify and approve submitted work
7. **Release Payment**: Transfer funds when conditions are met

## 🔐 Authentication

The project uses Sui's ZKLogin for authentication, providing a seamless user experience while maintaining security and privacy.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the [LICENSE] - see the LICENSE file for details.

## 📞 Contact

For questions and support, please open an issue in the GitHub repository.