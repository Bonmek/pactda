# Project Development Guidelines for AI Assistance

This document provides guidelines and context for AI coding assistants (like GitHub Copilot) working on this project. Adhering to these principles will ensure consistency and alignment with the project's architecture and technology stack.

---

## Project Technology Stack

* **Frontend:** React (Functional Components, Hooks)
* **Build Tool:** Vite
* **Styling:** Tailwind CSS (Utility-first)
* **Language:** TypeScript (Strict mode)
* **Blockchain:** Sui Network
    * **SDK:** `@mysten/sui.js` (Sui TypeScript SDK)
    * **Wallet Integration:** Sui Wallet adapters (e.g., `@mysten/wallet-adapter`)
* **Cross-Chain:** Wormhole (if applicable, specify usage areas)
* **State Management (Frontend):**
    * General UI State: Zustand
    * Asynchronous Data / Blockchain Data: `react-query` or `swr` (check which is used)
* **Backend:** Express.js
* **Package Manager:** npm or yarn (check which is used)

## Architecture & Structure

* The project follows a **feature-based architecture**. Look for code related to specific functionalities within the `src/features/` directory.
* **Frontend Root:** `src/`
* **Backend Root:** `backend/`
* **Sui Contracts:** If included in the repo, contracts are likely in a `contracts/` or `move/` directory.
* **Key Directories:**
    * `src/features/{feature-name}/`: Feature-specific components, hooks, pages, services, locales, stores.
    * `src/components/`: Reusable, non-feature-specific UI components.
    * `src/pages/`: Top-level route components.
    * `src/api/`: Services/logic for interacting with the **Express backend** (not blockchain).
    * `src/store/`: Global Zustand stores.
    * `src/locales/`: Global i18n translation files.
    * `src/routes.tsx`: Frontend React Router configuration.
    * `src/types/`: Global TypeScript type definitions.
    * `backend/src/`: Express application code.

## Frontend Development Conventions

1.  **React:** Use functional components and hooks. Avoid class components.
2.  **Styling:** **Only use Tailwind CSS classes** for styling components. Avoid creating custom `.css` or `.module.css` files unless absolutely necessary for complex custom styles (which should be rare).
3.  **TypeScript:** Write type-safe code. Define interfaces for props, state, API responses, and especially for Sui Move object structures.
4.  **Routing:** Configure all frontend routes in `src/routes.tsx` using React Router.
5.  **State Management:**
    * Use **Zustand** for simple, shared UI state.
    * Use **`react-query`** (or **`swr`**) for managing asynchronous data fetching, caching, and synchronization, particularly for data read from the Sui blockchain.
6.  **Internationalization (i18n):**
    * Implement multilingual support using JSON translation files.
    * Global translations: `src/locales/{lang}.json`.
    * Feature-specific translations: `src/features/{feature-name}/locales/{lang}.json`.
    * **Always** provide translations for existing language files when adding new text.
7.  **Icons:**
    * Prefer icons from standard React-compatible libraries (e.g., Lucide, React Icons).
    * Only use custom SVGs as a last resort if an icon cannot be found in libraries.
8.  **User Notifications (Toasts):**
    * Use a toast notification system for user feedback.
    * Follow color conventions: Green (Success/Info), Yellow (Warning), Red (Error). This is crucial for blockchain transaction feedback.

## Blockchain Interaction Guidelines (Sui)

1.  **SDK:** Use `@mysten/sui.js` for all interactions with the Sui network (fetching objects, building transactions, etc.).
2.  **Wallet:** Use the configured wallet adapter library for connecting wallets, getting user addresses, and requesting transaction signatures. **Never** handle private keys in the application code.
3.  **Transactions:**
    * Build transaction blocks (`TransactionBlock`).
    * Request user signature and execution via the connected wallet adapter.
    * Handle the transaction response, including monitoring status until finalized.
    * Provide clear toast notifications for each stage (signing, submitting, success, failure).
4.  **Data Types:** Map Sui Move contract types (Structs, Objects) to TypeScript interfaces for safe data handling in the frontend.
5.  **Reading Data:** Use the SDK to fetch data from the Sui network. Use `react-query` or `swr` hooks to manage the state of fetched blockchain data.

## Backend (Express) Role

1.  The Express backend is **NOT** the primary database for data residing on the Sui blockchain.
2.  Its role is limited to:
    * Serving the frontend application.
    * Handling traditional off-chain user authentication/sessions (if applicable).
    * Providing APIs for non-blockchain related data or functionality.
    * Potentially acting as a proxy/BFF for certain Sui RPC calls if server-side processing or privacy is required before broadcasting.
    * Handling backend processes related to blockchain events (e.g., listening to events, indexing off-chain data).

## Data Flow

* Frontend interacts directly with the Sui Network via `@mysten/sui.js` and wallet adapters for on-chain data and transactions.
* Frontend interacts with the Express backend (`backend/`) via API calls (`src/api/`) for off-chain data and functionality.

## General Practices

* Write clean, readable, and maintainable TypeScript code.
* Follow project-specific linting and formatting rules.
* Prioritize user experience, especially for blockchain interactions (clear feedback, handling delays and errors).

---

When writing code, please refer to these guidelines to ensure consistency and proper use of the project's technologies and architecture.