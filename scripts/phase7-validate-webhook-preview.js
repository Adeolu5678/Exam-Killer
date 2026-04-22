#!/usr/bin/env node

const fs = require('node:fs');
const { upsertEvidenceRecord } = require('./phase7-evidence');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = 'true';
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = args['dry-run'] === 'true';
  const baseUrl = args['base-url'];
  const payloadFile = args['payload-file'];
  const signature = args.signature;
  const routePath = args.path || '/api/v1/payments/webhook';

  if (dryRun) {
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: true,
          mode: 'dry-run',
          required_args: ['--base-url', '--payload-file', '--signature'],
          optional_args: ['--path'],
        },
        null,
        2,
      )}\n`,
    );
    return;
  }

  if (!baseUrl || !payloadFile || !signature) {
    throw new Error(
      'Usage: node scripts/phase7-validate-webhook-preview.js --base-url <url> --payload-file <json> --signature <sig> [--path /api/v1/payments/webhook]',
    );
  }

  const payload = fs.readFileSync(payloadFile, 'utf8');
  const endpoint = `${baseUrl.replace(/\/$/, '')}${routePath}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-paystack-signature': signature,
    },
    body: payload,
  });

  const bodyText = await response.text();
  if (!response.ok) {
    throw new Error(`Webhook validation failed (${response.status}): ${bodyText}`);
  }

  const record = upsertEvidenceRecord('payment_webhook_preview', true, {
    endpoint,
    status: response.status,
    payload_file: payloadFile,
  });

  process.stdout.write(`${JSON.stringify(record, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
