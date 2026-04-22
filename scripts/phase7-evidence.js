#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

function getEvidencePath() {
  return (
    process.env.PHASE7_VALIDATION_EVIDENCE_PATH ||
    path.join(process.cwd(), '.phase7-validation.json')
  );
}

function readEvidence() {
  const evidencePath = getEvidencePath();
  try {
    const raw = fs.readFileSync(evidencePath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

function writeEvidence(next) {
  const evidencePath = getEvidencePath();
  fs.writeFileSync(evidencePath, JSON.stringify(next, null, 2));
}

function upsertEvidenceRecord(key, passed, details) {
  const current = readEvidence();
  const next = {
    ...current,
    [key]: {
      passed,
      timestamp: new Date().toISOString(),
      details: details || {},
    },
  };
  writeEvidence(next);
  return next;
}

module.exports = {
  getEvidencePath,
  readEvidence,
  writeEvidence,
  upsertEvidenceRecord,
};
