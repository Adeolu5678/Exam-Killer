import { describe, expect, it } from 'vitest';

import { readValidationEvidence } from './validation-evidence';

describe('validation evidence reader', () => {
  it('returns empty evidence when file is missing', async () => {
    process.env.PHASE7_VALIDATION_EVIDENCE_PATH = `.tmp-missing-evidence-${Date.now()}.json`;
    const evidence = await readValidationEvidence();
    expect(evidence).toEqual({});
    delete process.env.PHASE7_VALIDATION_EVIDENCE_PATH;
  });
});
