// frontend/src/config/contractTemplates.ts

// Matches agreementTypes in CreateForm.tsx and ContractDetail/index.tsx
// 0: General, 1: Art, 2: Programming, 3: Audit, 4: Service
const AGREEMENT_TYPES = {
  GENERAL: 0,
  ART: 1,
  PROGRAMMING: 2,
  AUDIT: 3,
  SERVICE: 4,
};

export interface ContractTemplate {
  id: string; // Unique ID for the template
  name: string; // Display name for the template selector
  description?: string; // Short description of the template
  contractDetails: {
    // Corresponds to fields in CreateForm's contractDetails state
    title?: string;
    contractType?: number; // Using number as per existing form
    termsReference?: string; // Might be markdown or plain text
    metadata?: string;
    partyBAddress?: string;
    // Dates are typically dynamic and not set by templates
  };
  milestones?: Array<{
    // Corresponds to fields in CreateForm's milestones state
    description: string;
    amount: number; // Using number for simplicity, form might handle string conversion
    // dueDate is typically dynamic
  }>;
}

export const contractTemplates: ContractTemplate[] = [
  {
    id: 'basic-service-agreement',
    name: 'Basic Service Agreement',
    description: 'A standard agreement for general services with common milestones.',
    contractDetails: {
      title: 'Service Agreement',
      contractType: AGREEMENT_TYPES.SERVICE,
      termsReference:
`1. Scope of Services: [Define the services to be provided]
2. Payment Terms: As per milestones.
3. Timeline: [Define project timeline]
4. Confidentiality: Both parties agree to maintain confidentiality.
5. Termination: [Define termination clauses]`,
      metadata: 'Standard Service Contract, Version 1.0',
      partyBAddress: '', // To be filled by user
    },
    milestones: [
      { description: 'Project Kick-off and Initial Payment', amount: 100 },
      { description: 'Mid-project Review and Payment', amount: 250 },
      { description: 'Final Delivery and Payment', amount: 150 },
    ],
  },
  {
    id: 'art-commission-agreement',
    name: 'Art Commission Agreement',
    description: 'Template for commissioning artwork, includes sketch and final art phases.',
    contractDetails: {
      title: 'Art Commission',
      contractType: AGREEMENT_TYPES.ART,
      termsReference:
`1. Commission Details: [Describe the artwork to be created - size, medium, subject, etc.]
2. Artist's Rights: Artist retains copyright unless otherwise agreed.
3. Client Revisions: [Number] rounds of minor revisions allowed.
4. Payment: 50% upfront, 50% upon completion.
5. Delivery: [Method and timeframe for delivering final artwork]`,
      metadata: 'Artwork Commission Contract v0.9',
      partyBAddress: '', // To be filled by user
    },
    milestones: [
      { description: 'Initial Deposit & Concept Sketch Approval', amount: 200 },
      { description: 'Final Artwork Delivery & Acceptance', amount: 200 },
    ],
  },
  {
    id: 'quick-freelance-agreement',
    name: 'Quick Freelance Task',
    description: 'A minimal template for small, quick freelance jobs with a single payment.',
    contractDetails: {
      title: 'Quick Freelance Task',
      contractType: AGREEMENT_TYPES.PROGRAMMING, // Example, could be GENERAL
      termsReference:
`1. Task: [Briefly describe the task]
2. Deliverables: [List specific deliverables]
3. Payment: Full payment upon completion and acceptance.`,
      metadata: 'Quick Task Agreement',
      partyBAddress: '',
    },
    milestones: [
      { description: 'Task Completion and Full Payment', amount: 50 },
    ],
  },
  {
    id: 'website-development-agreement',
    name: 'Website Development Agreement',
    description: 'For website design and development projects with multiple phases.',
    contractDetails: {
      title: 'Website Development Project',
      contractType: AGREEMENT_TYPES.PROGRAMMING,
      termsReference:
`1. Project Scope: Development of [description of website]
   - Phase 1: Design & Wireframes
   - Phase 2: Frontend Development
   - Phase 3: Backend Development & Integration
   - Phase 4: Testing & Deployment
2. Payment Schedule: Linked to phase completion.
3. Client Responsibilities: Timely feedback, provision of content.
4. Maintenance: [Optional: Define post-launch maintenance terms]`,
      metadata: 'Web Dev Contract v1.2',
    },
    milestones: [
      { description: 'Phase 1: Design Approval & Initial Payment', amount: 500 },
      { description: 'Phase 2: Frontend Complete & Payment', amount: 750 },
      { description: 'Phase 3: Backend Complete & Payment', amount: 750 },
      { description: 'Phase 4: Deployment & Final Payment', amount: 500 },
    ],
  },
];
