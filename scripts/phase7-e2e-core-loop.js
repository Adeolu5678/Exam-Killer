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

async function fetchJson(url, options, label) {
  const response = await fetch(url, options);
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`${label} failed (${response.status}): ${body}`);
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`${label} returned non-JSON: ${body}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = args['dry-run'] === 'true';
  const baseUrl = args['base-url'];
  const sessionCookie = args['session-cookie'];
  const workspaceId = args['workspace-id'];
  const sourceId = args['source-id'];

  if (dryRun) {
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: true,
          mode: 'dry-run',
          required_args: ['--base-url', '--session-cookie', '--workspace-id', '--source-id'],
        },
        null,
        2,
      )}\n`,
    );
    return;
  }

  if (!baseUrl || !sessionCookie || !workspaceId || !sourceId) {
    throw new Error(
      'Usage: node scripts/phase7-e2e-core-loop.js --base-url <url> --session-cookie <cookie> --workspace-id <id> --source-id <id>',
    );
  }

  const root = baseUrl.replace(/\/$/, '');
  const headers = { cookie: `session=${sessionCookie}` };

  await fetchJson(`${root}/api/v1/me`, { method: 'GET', headers }, 'session check');
  await fetchJson(
    `${root}/api/v1/workspaces/${workspaceId}`,
    { method: 'GET', headers },
    'workspace fetch',
  );
  await fetchJson(
    `${root}/api/v1/workspaces/${workspaceId}/sources`,
    { method: 'GET', headers },
    'workspace sources fetch',
  );
  const signedUrlPayload = await fetchJson(
    `${root}/api/v1/sources/${sourceId}/url?expires=15`,
    { method: 'GET', headers },
    'signed source url fetch',
  );

  const signedUrl = signedUrlPayload?.data?.url;
  if (typeof signedUrl !== 'string' || signedUrl.length === 0) {
    throw new Error('Core-loop check failed: signed URL missing from source URL payload');
  }

  const signedFileResponse = await fetch(signedUrl, { method: 'GET' });
  if (!signedFileResponse.ok) {
    throw new Error(`Core-loop check failed: signed file fetch returned ${signedFileResponse.status}`);
  }

  await fetchJson(`${root}/api/v1/payments/status`, { method: 'GET', headers }, 'billing status');

  const record = upsertEvidenceRecord('core_flows_e2e', true, {
    base_url: root,
    workspace_id: workspaceId,
    source_id: sourceId,
    checks: [
      'session',
      'workspace',
      'workspace-sources',
      'signed-source-url',
      'signed-file-read',
      'billing-status',
    ],
  });

  process.stdout.write(`${JSON.stringify(record, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
