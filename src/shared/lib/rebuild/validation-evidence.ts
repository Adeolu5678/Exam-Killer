import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface ValidationEvidenceRecord {
  passed: boolean;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface ValidationEvidence {
  core_flows_e2e?: ValidationEvidenceRecord;
  payment_webhook_preview?: ValidationEvidenceRecord;
  signed_file_access?: ValidationEvidenceRecord;
}

function getEvidencePath(): string {
  const configured = process.env.PHASE7_VALIDATION_EVIDENCE_PATH;
  if (configured && configured.trim().length > 0) {
    return configured.trim();
  }

  return path.join(process.cwd(), '.phase7-validation.json');
}

export async function readValidationEvidence(): Promise<ValidationEvidence> {
  const evidencePath = getEvidencePath();

  try {
    const raw = await fs.readFile(evidencePath, 'utf8');
    const parsed = JSON.parse(raw) as ValidationEvidence;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'ENOENT'
    ) {
      return {};
    }

    return {};
  }
}
