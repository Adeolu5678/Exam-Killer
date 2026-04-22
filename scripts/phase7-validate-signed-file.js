#!/usr/bin/env node

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
  const sourceId = args['source-id'];
  const sessionCookie = args['session-cookie'];
  const expires = args.expires || '15';

  if (dryRun) {
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: true,
          mode: 'dry-run',
          required_args: ['--base-url', '--source-id', '--session-cookie'],
          optional_args: ['--expires'],
        },
        null,
        2,
      )}\n`,
    );
    return;
  }

  if (!baseUrl || !sourceId || !sessionCookie) {
    throw new Error(
      'Usage: node scripts/phase7-validate-signed-file.js --base-url <url> --source-id <id> --session-cookie <cookie> [--expires 15]',
    );
  }

  const endpoint = `${baseUrl.replace(/\/$/, '')}/api/v1/sources/${sourceId}/url?expires=${encodeURIComponent(expires)}`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      cookie: `session=${sessionCookie}`,
    },
  });

  const payloadText = await response.text();
  if (!response.ok) {
    throw new Error(`Signed URL endpoint failed (${response.status}): ${payloadText}`);
  }

  let payload;
  try {
    payload = JSON.parse(payloadText);
  } catch {
    throw new Error(`Signed URL endpoint returned non-JSON: ${payloadText}`);
  }

  const signedUrl = payload?.data?.url;
  if (typeof signedUrl !== 'string' || signedUrl.length === 0) {
    throw new Error(`Signed URL missing from response: ${payloadText}`);
  }

  const fileResponse = await fetch(signedUrl, { method: 'GET' });
  if (!fileResponse.ok) {
    throw new Error(`Signed file fetch failed (${fileResponse.status})`);
  }

  const record = upsertEvidenceRecord('signed_file_access', true, {
    endpoint,
    signed_url_host: new URL(signedUrl).host,
    status: fileResponse.status,
  });

  process.stdout.write(`${JSON.stringify(record, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
