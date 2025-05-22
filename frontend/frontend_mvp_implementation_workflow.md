# Frontend MVP Implementation Workflow for PactDA

This document outlines the workflow for implementing the missing elements of the PactDA frontend MVP. It is intended to guide an AI assistant in the development process.

## General Principles for AI Implementation:

*   **Understand Context:** Before implementing a feature, review relevant existing code (components, services, types, hooks) to maintain consistency and leverage existing logic.
*   **File Structure:** Place new components in `src/components/`, hooks in `src/hooks/`, services in `src/service/`, types in `src/types/`, and pages/views in `src/pages/`. Create subfolders for organization where appropriate (e.g., `src/components/ContractDetail/`).
*   **Modularity:** Create reusable components and functions.
*   **State Management:** Utilize existing state management solutions (e.g., React Context, Zustand, Redux if present) or propose a suitable one if none exists for complex state. For local component state, `useState` and `useEffect` are appropriate.
*   **Error Handling:** Implement robust error handling, providing user-friendly messages and logging technical details to the console.
*   **User Experience:** Prioritize a clear and intuitive user experience. Use loading states, feedback messages, and clear calls to action.
*   **Styling:** Adhere to the existing styling conventions (Tailwind CSS).
*   **Testing (Optional but Recommended):** For complex logic, consider outlining or generating basic unit tests.
*   **Iterative Refinement:** The AI should be prepared to show its work, receive feedback, and iterate on the implementation.

---

## 1. Status Mapping & Display

**Goal:** Convert numeric status codes from the smart contract into human-readable labels and display them with appropriate visual cues.

**Workflow:**

1.  **Identify Status Codes:**
    *   Locate the `ContractStatus` enum (e.g., in `src/types/pactDa.ts` or contract ABI).
    *   Locate or define enums/types for `MilestoneStatus`.
2.  **Create Mapping Functions/Objects:**
    *   In a utility file (e.g., `src/lib/utils.ts` or a new `src/lib/statusUtils.ts`):
        *   Create a function `getContractStatusLabel(status: ContractStatus): string` that returns a user-friendly string for each status.
        *   Create a function `getMilestoneStatusLabel(status: MilestoneStatus): string`.
        *   Consider creating functions that return style information (e.g., Tailwind CSS classes for colors) based on status:
            *   `getContractStatusStyle(status: ContractStatus): string`
            *   `getMilestoneStatusStyle(status: MilestoneStatus): string`
3.  **Implement Visual Indicators:**
    *   Review existing `ContractStatusBadge.tsx` and adapt or create new components if needed for milestones.
    *   Ensure these components use the mapping functions to display labels and apply styles.
4.  **Integrate into UI:**
    *   Update components displaying contract status (e.g., `ContractDetail/index.tsx`, contract list items) to use the new mapping functions/components.
    *   Update components displaying milestone status (e.g., within `MilestonesCard.tsx` or similar) to use the new mapping functions/components.

---

## 2. Transaction Monitoring

**Goal:** Provide users with real-time feedback on the status of their blockchain transactions and handle failures gracefully.

**Workflow:**

1.  **Review Existing Transaction Handling:**
    *   Examine how transactions are currently submitted (e.g., in `PactdaService.ts` and page components like `ContractDetail/index.tsx` using `useSignAndExecuteTransaction`).
2.  **Standardize Transaction Submission Flow:**
    *   If not already present, create a wrapper function or hook for submitting transactions that incorporates:
        *   Initiation of transaction (e.g., calling `signAndExecuteTransaction`).
        *   Displaying a loading state/toast notification (e.g., "Processing transaction...").
        *   Waiting for transaction confirmation (`suiClient.waitForTransaction`).
        *   Updating UI/toast on success (e.g., "Transaction successful!").
        *   Updating UI/toast on failure, providing a clear error message.
3.  **Error Handling & Retries:**
    *   Parse common transaction errors from the Sui network or smart contract.
    *   Provide user-friendly messages for these errors.
    *   For certain types of failures (e.g., network issues), consider implementing a simple retry mechanism (e.g., a button to "Try Again").
4.  **UI Integration:**
    *   Use a consistent notification system (e.g., `sonner` toasts) for all transaction feedback.
    *   Update relevant parts of the UI (e.g., disabling buttons during a transaction, re-fetching data after success).
    *   **Example:** The `handleSignContract` and `handleSubmitContract` in `ContractDetail/index.tsx` can be refactored to use `toast.promise` for better UX, which is a good pattern to follow.

---

## 3. Balance & Cost Estimation

**Goal:** Inform users about potential transaction costs and ensure they have sufficient funds before initiating a transaction.

**Workflow:**

1.  **Balance Display (if not already present):**
    *   Fetch and display the user's SUI balance in a prominent location (e.g., header, wallet connection area).
    *   Use `suiClient.getBalance`.
2.  **Transaction Cost Estimation (Research Needed):**
    *   **Sui Gas Mechanics:** Understand how gas is calculated on Sui (computation units, storage, etc.).
    *   **Dry Run Capability:** Investigate if `suiClient` or related libraries offer a "dry run" feature for transactions (`suiClient.dryRunTransactionBlock`). This executes a transaction without committing it to estimate gas costs.
3.  **Implement Estimation Logic:**
    *   For key transaction types (create contract, fund escrow, etc.):
        *   Construct the transaction block.
        *   If dry run is available, use it to get an estimated gas cost.
        *   Display this estimated cost to the user *before* they sign.
4.  **Pre-Transaction Balance Check:**
    *   Before allowing a user to initiate a transaction:
        *   Fetch their current SUI balance.
        *   Compare it with the estimated transaction cost (if available) or a predefined buffer.
        *   If the balance is insufficient, disable the transaction button and inform the user.
5.  **UI Integration:**
    *   Display estimated costs clearly near action buttons.
    *   Provide clear messages if balance is insufficient.

---

## 4. Multi-step Process Management

**Goal:** Manage the state and flow of complex user interactions that involve multiple steps or transactions.

**Workflow:**

1.  **Identify Multi-step Processes:**
    *   Examples:
        *   Create Contract + Add Milestones + Submit + Sign.
        *   Milestone Submission -> Approval -> Payment Release.
2.  **State Management Strategy:**
    *   For complex flows, consider a state machine library (e.g., XState) or a dedicated React hook with `useReducer` to manage the current step, form data across steps, and loading/error states.
    *   For simpler flows, local component state (`useState`) might suffice.
3.  **UI for Steppers/Progress Indicators:**
    *   Implement UI components (e.g., a stepper, progress bar) to visually guide the user through the steps.
4.  **Data Persistence Across Steps:**
    *   Ensure data entered in one step is carried over to subsequent steps.
5.  **Recovery Mechanisms:**
    *   Consider how to handle interruptions (e.g., user closes browser).
    *   For critical flows, explore saving intermediate state to local storage (ensure sensitive data is handled carefully).
    *   Allow users to resume an interrupted process if feasible.

---

## 5. Input Validation & Error Handling

**Goal:** Ensure data integrity through client-side validation and provide clear, actionable error messages from contract interactions.

**Workflow:**

1.  **Client-Side Validation:**
    *   Use libraries like `zod` or `yup` for schema-based validation of forms (e.g., contract creation form, milestone details).
    *   Implement real-time validation where appropriate (on blur, on change).
    *   Display clear validation messages next to input fields.
    *   Disable submission buttons if forms are invalid.
2.  **Contract Error Code Mapping:**
    *   **Obtain Error Codes:** Identify potential error codes/messages returned by the PactDA smart contract (from its Move source or documentation).
    *   **Create a Mapping:** In a utility file, create a function or object to map these contract error codes/messages to user-friendly explanations.
        *   `mapContractError(errorCodeOrMessage: string): string`
3.  **Displaying Contract Errors:**
    *   When a transaction fails due to a contract error:
        *   Catch the error.
        *   Use the mapping function to get a user-friendly message.
        *   Display this message to the user (e.g., via a toast).
4.  **Generic Error Handling:**
    *   Have a fallback for unexpected errors (network issues, unmapped contract errors).

---

## 6. Event Listeners

**Goal:** Subscribe to relevant smart contract events and update the UI in real-time or near real-time.

**Workflow:**

1.  **Identify Key Contract Events:**
    *   List all events emitted by the PactDA smart contract that are relevant to the frontend (e.g., `ContractCreated`, `MilestoneAdded`, `ContractSigned`, `PaymentReleased`, `DisputeRaised`).
    *   Understand the data payload of each event.
2.  **Event Subscription Mechanism:**
    *   The current implementation in `ContractDetail/index.tsx` uses `suiClient.queryEvents` with a `useEffect` hook that re-fetches on contract changes. This is polling-based.
    *   **For real-time updates (if desired and supported):** Investigate `suiClient.subscribeEvent`. This would provide a more immediate update mechanism.
        *   **Consideration:** WebSocket connections can be resource-intensive. Polling might be sufficient for an MVP depending on the desired responsiveness.
3.  **Event Handling Logic:**
    *   When an event is received (either via polling or subscription):
        *   Parse the event data.
        *   Update the relevant application state (e.g., re-fetch contract details, update a list of activities, modify a specific milestone's status).
        *   Optionally, trigger a UI notification.
4.  **UI Updates:**
    *   Ensure components re-render correctly when the underlying data changes due to an event.
    *   The "Activity Timeline" is a prime candidate for displaying formatted event data.
    *   **Refine Event Filtering:** The current client-side filter in `ContractDetail/index.tsx` for `relevantEvents` needs to be robust. Ensure it correctly identifies events related to the *specific* contract being viewed, using unique identifiers from the event payload (e.g., `contract_id` if present in `event.parsedJson`).

---

## 7. Notification System

**Goal:** Alert users to important contract state changes and remind them of pending actions.

**Workflow:**

1.  **Identify Notification Triggers:**
    *   Contract signed by the other party.
    *   Milestone approved.
    *   Payment received/released.
    *   Dispute initiated/resolved.
    *   Action required (e.g., your turn to sign, approve a milestone).
2.  **Choose Notification Method:**
    *   **In-App Toasts:** Use `sonner` (already in use) for immediate, non-critical notifications.
    *   **Persistent In-App Indicators:** Badges or icons on a navigation menu or dashboard to indicate pending actions.
    *   **(Future Consideration):** Email or push notifications (out of scope for MVP unless specified).
3.  **Implement Notification Logic:**
    *   Trigger notifications based on:
        *   Contract events (see section 6).
        *   User role and current contract state (e.g., if user is Party B and Party A has signed, notify Party B to sign).
4.  **User Interface for Notifications:**
    *   Design a clear and non-intrusive way to display notifications.
    *   Allow users to dismiss notifications.
    *   Provide links from notifications to the relevant contract or action if applicable.

---

## 8. Cross-Chain Integration (If Applicable)

**Goal:** If the MVP needs to interact with bridges or other chains, provide wrapper functions for these operations.

**Workflow:**

1.  **Clarify Scope:** Determine if any cross-chain functionality is part of this MVP.
    *   The `cross-chain-poc` folder suggests this is a possibility.
2.  **Identify Bridge/SDKs:**
    *   If yes, identify the specific bridge (e.g., Wormhole) and its SDKs/APIs.
    *   The `wormhole-solidity-sdk` in `lib/` and `Milestone` type from `@/features/wormhole/types` suggest Wormhole integration.
3.  **Develop Wrapper Functions:**
    *   In `src/service/` (e.g., `WormholeService.ts` or integrated into `PactdaService.ts`):
        *   Create functions to abstract the complexities of bridge interactions (e.g., `initiateCrossChainTransfer(...)`, `checkCrossChainTransferStatus(...)`).
4.  **UI Integration:**
    *   Design UI elements for initiating and monitoring cross-chain operations.
    *   Handle different states (pending, confirmed, failed).
5.  **Error Handling:**
    *   Implement robust error handling for bridge interactions, which can be complex.

---

## 9. Contract Templates

**Goal:** Allow users to quickly create contracts using predefined templates.

**Workflow:**

1.  **Define Template Structure:**
    *   Determine the fields that will be part of a template (e.g., title, terms, milestone structure, type).
    *   Store templates (e.g., as JSON objects in the frontend or fetched from a backend if dynamic).
2.  **Template Selection UI:**
    *   On the contract creation page, provide a way for users to select a template (e.g., a dropdown or a list of cards).
3.  **Populate Form from Template:**
    *   When a template is selected, automatically populate the contract creation form fields with the template data.
4.  **Save/Load Drafts (Optional Extension):**
    *   Allow users to save their partially filled contract details (potentially with milestones) as a draft (e.g., to local storage).
    *   Provide a way to load these drafts.

---

## 10. User Role Detection

**Goal:** Automatically identify the user's role in a contract (Party A, Party B, Arbiter, or observer) and tailor the UI/actions accordingly.

**Workflow:**

1.  **Fetch Contract Details:**
    *   Ensure `PactDaContract` type includes `partyA`, `partyB`, and `arbiter` (if applicable) addresses.
2.  **Get Current User Address:**
    *   Use `useCurrentAccount` from `@mysten/dapp-kit` to get the connected user's address.
3.  **Implement Role Detection Logic:**
    *   Create a hook (e.g., `useContractRole(contract: PactDaContract | null): string`) or a utility function:
        *   Input: contract object, current user address.
        *   Output: Role string (e.g., "partyA", "partyB", "arbiter", "observer").
        *   Logic: Compare user address with `contract.partyA`, `contract.partyB`, etc.
4.  **Conditional UI Rendering:**
    *   Use the detected role to:
        *   Show/hide action buttons (e.g., only Party A can submit a draft, only Party B can sign after Party A).
        *   Display role-specific information or perspectives.
        *   Control access to certain features (e.g., dispute initiation).
    *   **Example:** The `ActionsCard` component already receives `address`, `partyA`, `partyB` and conditionally renders buttons. This pattern should be expanded and centralized using the role detection logic.

---

This workflow provides a structured approach. The AI should ask clarifying questions if any part is unclear and present its implementation plan for each section before coding.
