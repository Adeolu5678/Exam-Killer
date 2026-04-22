#!/usr/bin/env node

const migrationOrder = [
  'users',
  'subscriptions and payment history',
  'workspaces',
  'memberships',
  'sources metadata',
  'tutor threads/messages if worth preserving',
  'flashcards/quizzes/study plans',
  'analytics snapshots if needed',
];

const migrationRules = [
  'Do not migrate broken or inconsistent derived data blindly.',
  'Reprocess sources where chunk/vector quality is uncertain.',
  'Preserve immutable payment records carefully.',
  'Backfill ownership and membership explicitly.',
];

const cutoverStrategy = [
  'Internal alpha on staging.',
  'Invite-only beta for trusted users.',
  'Migrate a subset of production users.',
  'Full production cutover only after parity on the core learning loop.',
];

const report = {
  generated_at: new Date().toISOString(),
  strategy: 'parallel-rebuild-no-in-place-rewrite',
  migration_order: migrationOrder,
  migration_rules: migrationRules,
  cutover_strategy: cutoverStrategy,
  environment_signals: {
    firebase_project: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || null,
    firebase_storage_bucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || null,
  },
};

if (process.argv.includes('--json')) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exit(0);
}

console.log('\nPhase 7 Migration Audit (dry run)');
console.log('=================================');
console.log(`Generated: ${report.generated_at}`);
console.log(`Strategy : ${report.strategy}`);

console.log('\nData migration order:');
migrationOrder.forEach((item, index) => {
  console.log(`${index + 1}. ${item}`);
});

console.log('\nMigration rules:');
migrationRules.forEach((rule, index) => {
  console.log(`${index + 1}. ${rule}`);
});

console.log('\nCutover strategy:');
cutoverStrategy.forEach((step, index) => {
  console.log(`${index + 1}. ${step}`);
});

console.log('\nEnvironment signals:');
console.log(`- NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${report.environment_signals.firebase_project || '(missing)'}`);
console.log(
  `- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: ${report.environment_signals.firebase_storage_bucket || '(missing)'}`,
);
console.log('\nThis tool is read-only and performs no data writes.');
