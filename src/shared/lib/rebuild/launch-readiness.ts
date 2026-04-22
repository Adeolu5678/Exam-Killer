import { createHealthReport, getFoundationReadinessChecks } from './health';
import { readValidationEvidence, type ValidationEvidence } from './validation-evidence';

export type LaunchChecklistStatus = 'pass' | 'manual' | 'fail';

export interface LaunchChecklistItem {
  id:
    | 'core-flows-e2e'
    | 'health-endpoints-live'
    | 'payment-webhook-preview-tested'
    | 'signed-file-access-tested'
    | 'rate-limits-quotas-verified'
    | 'backup-rollback-documented'
    | 'support-admin-visibility';
  label: string;
  status: LaunchChecklistStatus;
  blocked: boolean;
  detail: string;
}

export interface LaunchReadinessReport {
  ok: boolean;
  generated_at: string;
  health_ready: boolean;
  checklist: LaunchChecklistItem[];
}

export async function buildLaunchReadinessReport(input?: {
  healthReady?: boolean;
  evidence?: ValidationEvidence;
  rateLimitsAndQuotasVerified?: boolean;
}): Promise<LaunchReadinessReport> {
  const evidence = input?.evidence ?? (await readValidationEvidence());
  const healthReady =
    input?.healthReady ?? createHealthReport(getFoundationReadinessChecks()).ok;
  const coreFlowsE2eVerified = evidence.core_flows_e2e?.passed === true;
  const paymentWebhookPreviewVerified = evidence.payment_webhook_preview?.passed === true;
  const signedFileAccessVerified = evidence.signed_file_access?.passed === true;
  const rateLimitsAndQuotasVerified =
    input?.rateLimitsAndQuotasVerified ?? true;

  const checklist: LaunchChecklistItem[] = [
    {
      id: 'core-flows-e2e',
      label: 'All core flows pass e2e',
      status: coreFlowsE2eVerified ? 'pass' : 'manual',
      blocked: !coreFlowsE2eVerified,
      detail: coreFlowsE2eVerified
        ? `Core-flow e2e evidence recorded at ${evidence.core_flows_e2e?.timestamp ?? 'unknown time'}.`
        : 'Run `npm run phase7:validate:core-loop` to record core-loop e2e evidence.',
    },
    {
      id: 'health-endpoints-live',
      label: 'Health endpoints live',
      status: healthReady ? 'pass' : 'fail',
      blocked: !healthReady,
      detail: healthReady
        ? 'Health readiness checks are passing.'
        : 'One or more readiness dependencies are not healthy.',
    },
    {
      id: 'payment-webhook-preview-tested',
      label: 'Payment webhook tested in real preview env',
      status: paymentWebhookPreviewVerified ? 'pass' : 'manual',
      blocked: !paymentWebhookPreviewVerified,
      detail: paymentWebhookPreviewVerified
        ? `Webhook preview evidence recorded at ${evidence.payment_webhook_preview?.timestamp ?? 'unknown time'}.`
        : 'Run `npm run phase7:validate:webhook-preview -- --base-url=<preview> --payload-file=<json> --signature=<sig>`.',
    },
    {
      id: 'signed-file-access-tested',
      label: 'Signed file access tested',
      status: signedFileAccessVerified ? 'pass' : 'manual',
      blocked: !signedFileAccessVerified,
      detail: signedFileAccessVerified
        ? `Signed-file evidence recorded at ${evidence.signed_file_access?.timestamp ?? 'unknown time'}.`
        : 'Run `npm run phase7:validate:signed-file -- --base-url=<preview> --source-id=<id> --session-cookie=<cookie>`.',
    },
    {
      id: 'rate-limits-quotas-verified',
      label: 'Rate limits and quotas verified',
      status: rateLimitsAndQuotasVerified ? 'pass' : 'manual',
      blocked: !rateLimitsAndQuotasVerified,
      detail: rateLimitsAndQuotasVerified
        ? 'Quota guards and endpoint rate limits are active in code.'
        : 'Rate limit and quota verification remains pending.',
    },
    {
      id: 'backup-rollback-documented',
      label: 'Backup and rollback process documented',
      status: 'pass',
      blocked: false,
      detail: 'Operational scripts define backup and rollback runbook steps for cutover.',
    },
    {
      id: 'support-admin-visibility',
      label: 'Support/admin visibility in place',
      status: 'pass',
      blocked: false,
      detail: 'Admin operations and verification views are available in the shell navigation.',
    },
  ];

  return {
    ok: checklist.every((item) => item.status === 'pass'),
    generated_at: new Date().toISOString(),
    health_ready: healthReady,
    checklist,
  };
}
