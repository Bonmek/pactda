// Shared milestone utilities for decoding, field access, and status mapping

/**
 * Decodes a milestone description from either a string or a vector<u8> (number[])
 */
export function decodeDescription(desc: string | number[] | undefined): string {
  if (!desc) return '';
  if (typeof desc === 'string') return desc;
  if (Array.isArray(desc)) {
    try {
      return new TextDecoder().decode(Uint8Array.from(desc));
    } catch {
      return '';
    }
  }
  return '';
}

/**
 * Gets a field from a milestone object, supporting both UI and on-chain structures
 */
export function getMilestoneField<T extends string>(milestone: any, field: T): any {
  if (milestone && typeof milestone === 'object') {
    if ('fields' in milestone && milestone.fields && field in milestone.fields) {
      return milestone.fields[field];
    }
    if (field in milestone) {
      return milestone[field];
    }
  }
  return undefined;
}

/**
 * Milestone status mapping (sync with Move contract)
 */
export const MILESTONE_STATUS_MAP: Record<number, string> = {
  0: 'Pending',
  1: 'Submitted',
  2: 'Approved',
  3: 'Disputed',
};

/**
 * Returns a human-readable milestone status label
 */
export function getMilestoneStatusLabel(status: number | string | undefined): string {
  if (typeof status === 'number') {
    return MILESTONE_STATUS_MAP[status] ?? String(status);
  }
  if (typeof status === 'string' && !isNaN(Number(status))) {
    return MILESTONE_STATUS_MAP[Number(status)] ?? status;
  }
  return '-';
}
