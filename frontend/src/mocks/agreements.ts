import { AgreementData } from '@/types/agreement';

export const generateMockAgreements = (): AgreementData[] => {
  const statuses = ['active', 'pending', 'draft'] as const;
  const types = ['Service Agreement', 'Art Commission', 'Audit', 'Development Contract', 'Consulting', 'Licensing'] as const;
  const roles = ['Client', 'Provider', 'Artist', 'Developer', 'Auditor', 'Consultant'] as const;
  const actions = ['View & Manage', 'Review & Sign', 'Edit / Send for Review', 'Awaiting Signature', 'Pending Approval'] as const;

  const mockAgreements: AgreementData[] = [];

  // Generate 30 mock agreements with better distribution
  for (let i = 1; i <= 30; i++) {
    // Weighted distribution of statuses
    const statusWeights = [
      { status: 'active', weight: 0.4 },
      { status: 'pending', weight: 0.2 },
      { status: 'completed', weight: 0.25 },
      { status: 'cancelled', weight: 0.1 },
      { status: 'draft', weight: 0.05 },
    ];
    
    // Calculate weighted random status
    const random = Math.random();
    let weightSum = 0;
    let status = 'active'; // default
    
    for (const { status: s, weight } of statusWeights) {
      weightSum += weight;
      if (random <= weightSum) {
        status = s;
        break;
      }
    }
    const type = types[Math.floor(Math.random() * types.length)];
    const yourRole = roles[Math.floor(Math.random() * roles.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const value = (Math.floor(Math.random() * 10000) + 1000).toString();
    const daysFromNow = Math.floor(Math.random() * 90) - 15; // -15 to 75 days from now
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + daysFromNow);
    const formattedDeadline = daysFromNow < 0 ? 'Overdue' : deadline.toISOString().split('T')[0];

    mockAgreements.push({
      id: i.toString(),
      title: `${type.split(' ')[0]} ${['Project', 'Agreement', 'Contract', 'Deal'][i % 4]} #${i}`,
      status,
      type,
      deadline: formattedDeadline,
      otherParty: {
        address: `0x${Math.random().toString(16).substring(2, 10)}`,
        displayName: `${['Acme', 'Globex', 'Initech', 'Umbrella', 'Stark', 'Wayne', 'Oscorp'][i % 7]} ${['Inc', 'Corp', 'Ltd', 'LLC', 'Co'][i % 5]}`,
      },
      yourRole,
      value: `${value} SUI`,
      action,
      ...(status === 'cancelled' ? { cancellationReason: ['Project scope changed', 'Client went with another provider', 'Budget constraints', 'Timing issues'][i % 4] } : {}),
    });
  }

  // Add specific examples including completed and cancelled statuses
  mockAgreements.push(
    // Active agreement
    {
      id: '100',
      title: 'Website Redesign Contract',
      status: 'active',
      type: 'Service Agreement',
      deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 days from now
      otherParty: {
        address: '0xClient1234',
        displayName: 'Acme Inc',
      },
      yourRole: 'Service Provider',
      value: '5000 SUI',
      action: 'View & Manage',
    },
    // Pending agreement
    {
      id: '101',
      title: 'Logo Design Commission',
      status: 'pending',
      type: 'Art Commission',
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days from now
      otherParty: {
        address: '0xArtist1234',
        displayName: 'Creative Studio',
      },
      yourRole: 'Client',
      value: '1200 SUI',
      action: 'Review & Sign',
    },
    // Completed agreement
    {
      id: '200',
      title: 'E-commerce Development',
      status: 'completed',
      type: 'Development Contract',
      deadline: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
      otherParty: {
        address: '0xRetail1234',
        displayName: 'ShopOnline Inc',
      },
      yourRole: 'Lead Developer',
      value: '15000 SUI',
      action: 'View Details',
    },
    // Another completed agreement
    {
      id: '201',
      title: 'Mobile App UI/UX Design',
      status: 'completed',
      type: 'Service Agreement',
      deadline: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 days ago
      otherParty: {
        address: '0xStartup1234',
        displayName: 'TechStart Inc',
      },
      yourRole: 'UI/UX Designer',
      value: '8500 SUI',
      action: 'View Details',
    },
    // Cancelled agreement
    {
      id: '300',
      title: 'Brand Identity Package',
      status: 'cancelled',
      type: 'Design Contract',
      deadline: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 10 days ago
      otherParty: {
        address: '0xBrand1234',
        displayName: 'BrandNew LLC',
      },
      yourRole: 'Client',
      value: '3200 SUI',
      action: 'View History',
      cancellationReason: 'Project scope changed'
    },
    // Another cancelled agreement
    {
      id: '301',
      title: 'SEO Optimization Service',
      status: 'cancelled',
      type: 'Marketing Contract',
      deadline: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 20 days ago
      otherParty: {
        address: '0xMarketing1234',
        displayName: 'Digital Marketing Pro',
      },
      yourRole: 'Service Provider',
      value: '2500 SUI',
      action: 'View History',
      cancellationReason: 'Client went with another provider'
    },
    // Draft agreement
    {
      id: '102',
      title: 'Smart Contract Audit',
      status: 'draft',
      type: 'Audit',
      deadline: 'N/A',
      otherParty: {
        address: '0xAudit1234',
        displayName: 'Security Firm',
      },
      yourRole: 'Auditor',
      value: '7500 SUI',
      action: 'Edit / Send for Review',
    }
  );

  return mockAgreements;
};

export const mockAgreements = generateMockAgreements();
