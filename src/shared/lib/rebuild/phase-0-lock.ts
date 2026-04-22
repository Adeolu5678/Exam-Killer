export type CanonicalAiProviderModel = 'provider_abstraction';
export type CanonicalOwnershipField = 'owner_user_id';
export type PrimaryDeploymentTarget = 'vercel_with_firebase_jobs';
export type StorageAccessModel = 'signed_urls_only';
export type MigrationHistoryStrategy = 'preserve_core_records_regenerate_derived_learning_history';
export type TestingReleaseMinimum =
  | 'lint'
  | 'type_check'
  | 'unit_tests'
  | 'integration_tests'
  | 'build'
  | 'smoke_e2e_preview';

export type RouteGroupKey = '(marketing)' | '(auth)' | '(app)';
export type ShellKey = 'AppShell' | 'WorkspaceShell';
export type DomainOwnerGroup =
  | 'platform_foundation'
  | 'learning_core'
  | 'learning_experience'
  | 'monetization_and_trust';
export type DomainKey =
  | 'auth'
  | 'users'
  | 'workspaces'
  | 'sources'
  | 'tutoring'
  | 'flashcards'
  | 'quizzes'
  | 'study_plans'
  | 'analytics'
  | 'billing'
  | 'identity'
  | 'exports';
export type CollectionName =
  | 'users'
  | 'workspaces'
  | 'workspace_members'
  | 'sources'
  | 'source_chunks'
  | 'jobs'
  | 'tutor_threads'
  | 'tutor_messages'
  | 'message_citations'
  | 'flashcard_decks'
  | 'flashcards'
  | 'flashcard_reviews'
  | 'quizzes'
  | 'quiz_questions'
  | 'quiz_attempts'
  | 'quiz_attempt_answers'
  | 'study_plans'
  | 'study_plan_sessions'
  | 'exam_dates'
  | 'subscriptions'
  | 'payments'
  | 'usage_counters'
  | 'processed_webhooks';
export type EnvironmentName = 'local' | 'preview' | 'staging' | 'production';
export type MvpFeatureKey =
  | 'signup_login'
  | 'profile_bootstrap'
  | 'workspace_creation'
  | 'source_upload_processing'
  | 'grounded_tutor'
  | 'flashcard_generation'
  | 'flashcard_review'
  | 'quiz_generation'
  | 'quiz_submission'
  | 'paystack_upgrade';
export type DeferredFeatureKey =
  | 'collaboration_invites'
  | 'whatsapp_sharing'
  | 'pdf_export'
  | 'anki_export'
  | 'advanced_analytics'
  | 'offline_mode_depth'
  | 'concept_maps'
  | 'voice_tutor';
export type AuditFindingSeverity = 'high' | 'medium';

export interface LockedDecisionSet {
  canonicalAiProviderModel: CanonicalAiProviderModel;
  canonicalOwnershipField: CanonicalOwnershipField;
  primaryDeploymentTarget: PrimaryDeploymentTarget;
  storageAccessModel: StorageAccessModel;
  migrationHistoryStrategy: MigrationHistoryStrategy;
  testingReleaseMinimums: TestingReleaseMinimum[];
}

export interface DependencyRuleSet {
  appMayImport: string[];
  featuresMayImport: string[];
  domainsMayImport: string[];
  sharedMayImport: string[];
  jobsMayImport: string[];
}

export interface DomainBoundary {
  domain: DomainKey;
  ownerGroup: DomainOwnerGroup;
  responsibilities: string[];
  excludedFromMvp: string[];
}

export interface CanonicalCollection {
  collection: CollectionName;
  ownershipField?: string;
  fields: string[];
  notes: string[];
}

export interface ApiDomainContract {
  domain: DomainKey | 'me' | 'jobs' | 'admin';
  routePrefix: string;
  handlers: string[];
  authRequirement: string;
  policyOwner: string;
  quotaBehavior: string;
  idempotencyStrategy: string;
}

export interface EnvironmentRequirement {
  environment: EnvironmentName;
  firebaseProject: string;
  storageBucket: string;
  aiProviderConfig: string;
  vectorConfig: string;
  paystackConfig: string;
  observability: string;
}

export interface LayoutDecisionSet {
  routeGroups: RouteGroupKey[];
  shells: ShellKey[];
  serverStateOwner: string;
  clientStateOwner: string;
  authStateOwner: string;
  designTokenSource: string;
  accessibilityRequirements: string[];
  performanceTargets: string[];
}

export interface MvpScopeFreeze {
  included: MvpFeatureKey[];
  deferred: DeferredFeatureKey[];
}

export interface AuditFinding {
  id: string;
  severity: AuditFindingSeverity;
  title: string;
  currentState: string;
  targetState: string;
  evidence: string[];
}

export interface RebuildMigrationLock {
  strategy: string;
  dataMigrationOrder: string[];
  rules: string[];
  cutover: string[];
}

export interface PhaseZeroValidationGate {
  name: string;
  status: 'locked';
  rationale: string;
}

export interface RebuildArchitectureLock {
  version: 'phase-0-v1';
  lockedOn: '2026-04-07';
  decisions: LockedDecisionSet;
  architecture: {
    topLevelStructure: string[];
    dependencyRules: DependencyRuleSet;
    routeVersionPrefix: '/api/v1';
    routeHandlerRule: string[];
    jobSystemRule: string[];
  };
  domains: DomainBoundary[];
  canonicalCollections: CanonicalCollection[];
  apiContracts: ApiDomainContract[];
  environments: EnvironmentRequirement[];
  layout: LayoutDecisionSet;
  mvpScope: MvpScopeFreeze;
  migration: RebuildMigrationLock;
  releaseCriteria: PhaseZeroValidationGate[];
  auditFindings: AuditFinding[];
}

export const REBUILD_ARCHITECTURE_LOCK: RebuildArchitectureLock = {
  version: 'phase-0-v1',
  lockedOn: '2026-04-07',
  decisions: {
    canonicalAiProviderModel: 'provider_abstraction',
    canonicalOwnershipField: 'owner_user_id',
    primaryDeploymentTarget: 'vercel_with_firebase_jobs',
    storageAccessModel: 'signed_urls_only',
    migrationHistoryStrategy: 'preserve_core_records_regenerate_derived_learning_history',
    testingReleaseMinimums: [
      'lint',
      'type_check',
      'unit_tests',
      'integration_tests',
      'build',
      'smoke_e2e_preview',
    ],
  },
  architecture: {
    topLevelStructure: ['src/app', 'src/domains', 'src/features', 'src/widgets', 'src/shared', 'src/jobs'],
    dependencyRules: {
      appMayImport: ['features', 'widgets', 'domains', 'shared'],
      featuresMayImport: ['domains', 'shared'],
      domainsMayImport: ['shared'],
      sharedMayImport: [],
      jobsMayImport: ['domains', 'shared'],
    },
    routeVersionPrefix: '/api/v1',
    routeHandlerRule: [
      'authenticate session',
      'validate request contract',
      'call exactly one domain use case',
      'map result into standard success or error envelope',
      'log normalized failures',
    ],
    jobSystemRule: [
      'source extraction is asynchronous',
      'embedding generation is asynchronous',
      'vector upsert and re-index are asynchronous',
      'large flashcard and quiz generation support job mode',
      'exports are asynchronous',
      'analytics materialization can run on event or schedule',
    ],
  },
  domains: [
    {
      domain: 'auth',
      ownerGroup: 'platform_foundation',
      responsibilities: ['login', 'signup', 'logout', 'session establishment', 'session refresh'],
      excludedFromMvp: [],
    },
    {
      domain: 'users',
      ownerGroup: 'platform_foundation',
      responsibilities: ['viewer profile', 'preferences', 'onboarding bootstrap'],
      excludedFromMvp: [],
    },
    {
      domain: 'workspaces',
      ownerGroup: 'learning_core',
      responsibilities: ['workspace CRUD', 'visibility', 'membership policy', 'workspace switching'],
      excludedFromMvp: [],
    },
    {
      domain: 'sources',
      ownerGroup: 'learning_core',
      responsibilities: ['upload URL flow', 'private storage metadata', 'processing jobs', 'chunk lifecycle'],
      excludedFromMvp: [],
    },
    {
      domain: 'tutoring',
      ownerGroup: 'learning_experience',
      responsibilities: ['threads', 'messages', 'prompt orchestration', 'retrieval', 'citations'],
      excludedFromMvp: [],
    },
    {
      domain: 'flashcards',
      ownerGroup: 'learning_experience',
      responsibilities: ['deck management', 'AI generation', 'review queue', 'review events'],
      excludedFromMvp: [],
    },
    {
      domain: 'quizzes',
      ownerGroup: 'learning_experience',
      responsibilities: ['quiz generation', 'question bank', 'attempt submission', 'review explanations'],
      excludedFromMvp: [],
    },
    {
      domain: 'study_plans',
      ownerGroup: 'learning_experience',
      responsibilities: ['study plans', 'exam dates', 'study sessions'],
      excludedFromMvp: [],
    },
    {
      domain: 'analytics',
      ownerGroup: 'learning_experience',
      responsibilities: ['streaks', 'progress summaries', 'workspace analytics', 'materialized reporting'],
      excludedFromMvp: ['advanced analytics beyond the core dashboard loop'],
    },
    {
      domain: 'billing',
      ownerGroup: 'monetization_and_trust',
      responsibilities: ['plans', 'checkout', 'subscription state', 'usage metering', 'webhooks'],
      excludedFromMvp: [],
    },
    {
      domain: 'identity',
      ownerGroup: 'monetization_and_trust',
      responsibilities: ['verification requests', 'verification state machine', 'admin review actions'],
      excludedFromMvp: ['student verification UX can follow the core MVP loop'],
    },
    {
      domain: 'exports',
      ownerGroup: 'monetization_and_trust',
      responsibilities: ['PDF export', 'Anki export', 'download jobs'],
      excludedFromMvp: ['all export functionality is deferred until after MVP stability'],
    },
  ],
  canonicalCollections: [
    {
      collection: 'users',
      ownershipField: 'uid',
      fields: ['uid', 'email', 'profile', 'academic_metadata', 'plan_state', 'verification_state', 'created_at', 'updated_at'],
      notes: ['Firestore persistence stays snake_case', 'internal domain models stay camelCase'],
    },
    {
      collection: 'workspaces',
      ownershipField: 'owner_user_id',
      fields: [
        'workspace_id',
        'owner_user_id',
        'name',
        'description',
        'course_code',
        'institution',
        'tutor_personality',
        'tutor_custom_instructions',
        'visibility',
        'last_accessed_at',
        'created_at',
        'updated_at',
        'archived_at',
      ],
      notes: ['owner_user_id replaces ambiguous user_id ownership for workspaces'],
    },
    {
      collection: 'workspace_members',
      fields: ['membership_id', 'workspace_id', 'user_id', 'role', 'status', 'invited_by_user_id', 'joined_at', 'created_at', 'updated_at'],
      notes: ['membership document id strategy must be explicit and query-compatible'],
    },
    {
      collection: 'sources',
      ownershipField: 'uploaded_by_user_id',
      fields: [
        'source_id',
        'workspace_id',
        'uploaded_by_user_id',
        'source_type',
        'file_name',
        'storage_path',
        'mime_type',
        'file_size_bytes',
        'checksum',
        'processing_status',
        'embedding_status',
        'processing_error',
        'page_count',
        'chunk_count',
        'created_at',
        'updated_at',
      ],
      notes: ['storage_path is canonical', 'public URLs are derived and short-lived'],
    },
    {
      collection: 'source_chunks',
      fields: ['chunk_id', 'source_id', 'workspace_id', 'chunk_index', 'content_preview', 'char_count', 'token_count', 'page_number', 'section_title', 'embedding_vector_id', 'created_at'],
      notes: ['vector metadata must not be the only durable source of chunk information'],
    },
    {
      collection: 'jobs',
      fields: ['job_id', 'job_type', 'status', 'workspace_id', 'source_id', 'attempt_count', 'last_error', 'created_at', 'started_at', 'completed_at', 'idempotency_key'],
      notes: ['job status is the contract between async workers and UI polling'],
    },
    {
      collection: 'tutor_threads',
      fields: ['thread_id', 'workspace_id', 'user_id', 'title', 'created_at', 'updated_at'],
      notes: ['threads normalize chat ownership and listing'],
    },
    {
      collection: 'tutor_messages',
      fields: ['message_id', 'thread_id', 'workspace_id', 'role', 'content', 'created_at'],
      notes: ['assistant persistence must not depend on stream completion side effects'],
    },
    {
      collection: 'message_citations',
      fields: ['citation_id', 'message_id', 'source_id', 'page_number', 'chunk_id', 'label', 'created_at'],
      notes: ['citations are structured records, not control strings inside response text'],
    },
    {
      collection: 'flashcard_decks',
      fields: ['deck_id', 'workspace_id', 'title', 'created_at', 'updated_at'],
      notes: ['deck metadata is separated from review history'],
    },
    {
      collection: 'flashcards',
      fields: ['flashcard_id', 'deck_id', 'workspace_id', 'front', 'back', 'tags', 'difficulty', 'created_at', 'updated_at'],
      notes: ['card content stays canonical and exportable'],
    },
    {
      collection: 'flashcard_reviews',
      fields: ['review_id', 'flashcard_id', 'user_id', 'rating', 'reviewed_at', 'interval_after_review', 'ease_factor_after_review'],
      notes: ['review events are append-only'],
    },
    {
      collection: 'quizzes',
      fields: ['quiz_id', 'workspace_id', 'created_by_user_id', 'title', 'question_count', 'created_at', 'updated_at'],
      notes: ['quiz shell stays separate from immutable attempts'],
    },
    {
      collection: 'quiz_questions',
      fields: ['question_id', 'quiz_id', 'question_text', 'question_type', 'options', 'correct_answer', 'explanation', 'difficulty', 'created_at'],
      notes: ['question bank structure supports analytics and reuse'],
    },
    {
      collection: 'quiz_attempts',
      fields: ['attempt_id', 'quiz_id', 'workspace_id', 'user_id', 'submitted_at', 'score', 'time_spent_seconds', 'created_at'],
      notes: ['attempts become immutable after submission'],
    },
    {
      collection: 'quiz_attempt_answers',
      fields: ['attempt_answer_id', 'attempt_id', 'question_id', 'user_answer', 'is_correct', 'explanation_snapshot', 'created_at'],
      notes: ['review screens consume normalized answer rows'],
    },
    {
      collection: 'study_plans',
      fields: ['study_plan_id', 'workspace_id', 'user_id', 'title', 'generated_by_ai', 'created_at', 'updated_at'],
      notes: ['generated plans remain editable'],
    },
    {
      collection: 'study_plan_sessions',
      fields: ['session_id', 'study_plan_id', 'workspace_id', 'scheduled_for', 'status', 'completed_at', 'created_at', 'updated_at'],
      notes: ['session completion must be idempotent'],
    },
    {
      collection: 'exam_dates',
      fields: ['exam_date_id', 'workspace_id', 'user_id', 'title', 'exam_date', 'created_at', 'updated_at'],
      notes: ['calendar views depend on stable exam entities'],
    },
    {
      collection: 'subscriptions',
      fields: ['subscription_id', 'user_id', 'plan', 'status', 'current_period_start', 'current_period_end', 'created_at', 'updated_at'],
      notes: ['subscription state is consumed by entitlement policy'],
    },
    {
      collection: 'payments',
      fields: ['payment_id', 'user_id', 'provider', 'provider_reference', 'amount', 'currency', 'status', 'created_at', 'updated_at'],
      notes: ['payment records are immutable except status transitions'],
    },
    {
      collection: 'usage_counters',
      fields: ['usage_counter_id', 'user_id', 'metric', 'window_start', 'window_end', 'count', 'updated_at'],
      notes: ['quotas and analytics use the same metering vocabulary'],
    },
    {
      collection: 'processed_webhooks',
      fields: ['processed_webhook_id', 'provider', 'event_id', 'processed_at', 'expires_at'],
      notes: ['webhook dedupe is a first-class persistence concern'],
    },
  ],
  apiContracts: [
    {
      domain: 'auth',
      routePrefix: '/api/v1/auth',
      handlers: ['POST /login', 'POST /logout', 'POST /signup', 'GET /session', 'POST /refresh'],
      authRequirement: 'public for login/signup, session-backed for logout/session/refresh',
      policyOwner: 'domains/auth/policies',
      quotaBehavior: 'none',
      idempotencyStrategy: 'login/logout tolerate repeated calls; refresh uses active session authority',
    },
    {
      domain: 'me',
      routePrefix: '/api/v1/me',
      handlers: ['GET /', 'PATCH /', 'PATCH /preferences', 'DELETE /'],
      authRequirement: 'session required',
      policyOwner: 'domains/users/policies',
      quotaBehavior: 'none',
      idempotencyStrategy: 'PATCH is last-write-wins with validated payloads',
    },
    {
      domain: 'workspaces',
      routePrefix: '/api/v1/workspaces',
      handlers: ['GET /', 'POST /', 'GET /:id', 'PATCH /:id', 'DELETE /:id', 'GET /:id/members'],
      authRequirement: 'session required',
      policyOwner: 'domains/workspaces/policies',
      quotaBehavior: 'workspace creation checks plan limits centrally',
      idempotencyStrategy: 'mutations are use-case driven and ownership-aware',
    },
    {
      domain: 'sources',
      routePrefix: '/api/v1/workspaces/:id/sources',
      handlers: ['GET /', 'POST /upload-url', 'POST /', 'GET /api/v1/sources/:id', 'DELETE /api/v1/sources/:id', 'POST /api/v1/sources/:id/reprocess'],
      authRequirement: 'session required with workspace policy check',
      policyOwner: 'domains/sources/policies',
      quotaBehavior: 'upload quota enforced before storage handoff',
      idempotencyStrategy: 'reprocessing keyed by source checksum or version',
    },
    {
      domain: 'jobs',
      routePrefix: '/api/v1/jobs',
      handlers: ['GET /:jobId'],
      authRequirement: 'session required with aggregate ownership check',
      policyOwner: 'domains/sources/policies',
      quotaBehavior: 'none',
      idempotencyStrategy: 'job status reads are pure and cache-safe for short durations',
    },
    {
      domain: 'tutoring',
      routePrefix: '/api/v1/workspaces/:id/tutor',
      handlers: ['POST /messages', 'GET /threads', 'GET /api/v1/tutor/threads/:threadId/messages', 'PATCH /api/v1/tutor/threads/:threadId'],
      authRequirement: 'session required with workspace access and entitlement checks',
      policyOwner: 'domains/tutoring/policies',
      quotaBehavior: 'AI quota and plan checks happen before provider invocation',
      idempotencyStrategy: 'thread creation and message persistence are explicit and transactionally safe',
    },
    {
      domain: 'flashcards',
      routePrefix: '/api/v1/workspaces/:id/flashcards',
      handlers: ['GET /', 'POST /generate', 'POST /', 'POST /api/v1/flashcards/:id/review', 'PATCH /api/v1/flashcards/:id', 'DELETE /api/v1/flashcards/:id'],
      authRequirement: 'session required with workspace policy check',
      policyOwner: 'domains/flashcards/policies',
      quotaBehavior: 'free-tier generation and review entitlements enforced centrally',
      idempotencyStrategy: 'review writes append new events rather than mutating history',
    },
    {
      domain: 'quizzes',
      routePrefix: '/api/v1/workspaces/:id/quizzes',
      handlers: ['GET /', 'POST /generate', 'GET /api/v1/quizzes/:id', 'POST /api/v1/quizzes/:id/attempts', 'POST /api/v1/quizzes/:id/submit'],
      authRequirement: 'session required with workspace policy check',
      policyOwner: 'domains/quizzes/policies',
      quotaBehavior: 'generation uses shared entitlement rules',
      idempotencyStrategy: 'submit creates immutable attempt state once',
    },
    {
      domain: 'study_plans',
      routePrefix: '/api/v1/workspaces/:id',
      handlers: ['GET /study-plan', 'POST /study-plan/generate', 'POST /exams', 'POST /sessions', 'PATCH /api/v1/sessions/:id/complete'],
      authRequirement: 'session required with workspace policy check',
      policyOwner: 'domains/study_plans/policies',
      quotaBehavior: 'generation shares AI safety and quota controls',
      idempotencyStrategy: 'session completion is idempotent per session id',
    },
    {
      domain: 'analytics',
      routePrefix: '/api/v1',
      handlers: ['GET /analytics/global', 'GET /workspaces/:id/analytics', 'GET /workspaces/:id/streak', 'GET /workspaces/:id/progress'],
      authRequirement: 'session required',
      policyOwner: 'domains/analytics/policies',
      quotaBehavior: 'none',
      idempotencyStrategy: 'read-only endpoints consume materialized metrics',
    },
    {
      domain: 'billing',
      routePrefix: '/api/v1/billing',
      handlers: ['GET /plans', 'POST /checkout', 'GET /subscription', 'GET /history', 'POST /webhook'],
      authRequirement: 'session required except webhook',
      policyOwner: 'domains/billing/policies',
      quotaBehavior: 'usage counters update from central metering service',
      idempotencyStrategy: 'checkout and webhook processing use provider reference dedupe keys',
    },
    {
      domain: 'identity',
      routePrefix: '/api/v1/identity',
      handlers: ['POST /verify'],
      authRequirement: 'session required',
      policyOwner: 'domains/identity/policies',
      quotaBehavior: 'none',
      idempotencyStrategy: 're-submissions respect verification state transitions',
    },
    {
      domain: 'admin',
      routePrefix: '/api/v1/admin',
      handlers: ['GET /verifications', 'PATCH /verifications/:id'],
      authRequirement: 'admin session required',
      policyOwner: 'domains/identity/policies',
      quotaBehavior: 'none',
      idempotencyStrategy: 'review actions are auditable status transitions',
    },
  ],
  environments: [
    {
      environment: 'local',
      firebaseProject: 'isolated local or emulator-backed Firebase project',
      storageBucket: 'local or non-production bucket',
      aiProviderConfig: 'development AI credentials with mock mode allowed',
      vectorConfig: 'development Pinecone index or isolated namespace configuration',
      paystackConfig: 'test keys only',
      observability: 'boot-time env validation plus local structured logging',
    },
    {
      environment: 'preview',
      firebaseProject: 'preview Firebase project',
      storageBucket: 'preview bucket with signed access',
      aiProviderConfig: 'preview provider keys and rate limits',
      vectorConfig: 'preview index or namespace isolation',
      paystackConfig: 'test keys with webhook secret validation',
      observability: 'error tracking, request logging, smoke e2e, and health endpoints',
    },
    {
      environment: 'staging',
      firebaseProject: 'staging Firebase project',
      storageBucket: 'staging bucket with signed access',
      aiProviderConfig: 'staging provider keys',
      vectorConfig: 'staging index or namespace isolation',
      paystackConfig: 'staging/test account with real webhook flow rehearsal',
      observability: 'release candidate monitoring, dashboards, and alerting hooks',
    },
    {
      environment: 'production',
      firebaseProject: 'production Firebase project',
      storageBucket: 'production private bucket with signed access',
      aiProviderConfig: 'production provider keys with cost guardrails',
      vectorConfig: 'production index and namespace governance',
      paystackConfig: 'live keys and live webhook secret',
      observability: 'structured logs, error tracking, health readiness checks, and rollback visibility',
    },
  ],
  layout: {
    routeGroups: ['(marketing)', '(auth)', '(app)'],
    shells: ['AppShell', 'WorkspaceShell'],
    serverStateOwner: 'TanStack Query',
    clientStateOwner: 'Zustand only for UI and transient interaction state',
    authStateOwner: 'server-backed session hooks instead of a giant client auth context',
    designTokenSource: 'existing tokenized CSS variables and premium mobile-first shell styling',
    accessibilityRequirements: [
      'keyboard navigation for core flows',
      'command palette accessibility',
      'screen-reader labels for uploads tutor controls and flashcard review',
      'touch-friendly controls on mobile',
      'no hover-only critical actions',
    ],
    performanceTargets: [
      'LCP < 2.5s on landing and dashboard',
      'INP < 200ms',
      'CLS < 0.1',
      'tutor stream begins within 1s after server accept',
      'virtualize large source lists',
      'code-split charts exports and heavy AI interfaces',
    ],
  },
  mvpScope: {
    included: [
      'signup_login',
      'profile_bootstrap',
      'workspace_creation',
      'source_upload_processing',
      'grounded_tutor',
      'flashcard_generation',
      'flashcard_review',
      'quiz_generation',
      'quiz_submission',
      'paystack_upgrade',
    ],
    deferred: [
      'collaboration_invites',
      'whatsapp_sharing',
      'pdf_export',
      'anki_export',
      'advanced_analytics',
      'offline_mode_depth',
      'concept_maps',
      'voice_tutor',
    ],
  },
  migration: {
    strategy: 'run the rebuild alongside the legacy app behind new route groups and migrate validated domains sequentially',
    dataMigrationOrder: [
      'users',
      'subscriptions and payment history',
      'workspaces',
      'workspace memberships',
      'source metadata',
      'tutor threads and messages only if quality is acceptable',
      'flashcards quizzes and study plans',
      'analytics snapshots only if needed',
    ],
    rules: [
      'do not migrate inconsistent derived data blindly',
      'reprocess sources when chunk or vector quality is uncertain',
      'preserve immutable payment records carefully',
      'backfill workspace ownership and membership explicitly',
    ],
    cutover: [
      'internal alpha on staging',
      'invite-only beta for trusted users',
      'migrate a subset of production users',
      'full cutover only after parity on the core learning loop',
    ],
  },
  releaseCriteria: [
    {
      name: 'prd-ssd-codebase-conflicts-resolved',
      status: 'locked',
      rationale: 'Phase 0 requires one canonical architecture lock before foundation work begins.',
    },
    {
      name: 'every-domain-has-owner-and-boundary',
      status: 'locked',
      rationale: 'Each domain above now has an owning group and explicit scope boundary.',
    },
    {
      name: 'required-phase-0-artifacts-captured-in-code',
      status: 'locked',
      rationale: 'Architecture, schema, API, environment, layout, MVP, migration, and release gates are now codified in this manifest.',
    },
  ],
  auditFindings: [
    {
      id: 'auth-state-duplication',
      severity: 'high',
      title: 'Auth state is duplicated across client context middleware and server helpers',
      currentState: 'Firebase client auth sync, cookie writes, middleware validation fetch, and subscription loading all participate in protected-route authority.',
      targetState: 'Server-trusted session cookies become the only protected-route authority, with thin client login/logout adapters and dedicated session hooks.',
      evidence: [
        'src/context/AuthContext.tsx:53-138',
        'src/middleware.ts:10-45',
        'src/shared/lib/firebase/server-auth.ts:41-105',
      ],
    },
    {
      id: 'workspace-ownership-ambiguity',
      severity: 'high',
      title: 'Workspace ownership still relies on user_id instead of an explicit ownership field',
      currentState: 'Rules, domain types, and route handlers interpret user_id as owner and actor, which obscures policy intent.',
      targetState: 'Workspace documents use owner_user_id while membership and activity records keep user_id for actor identity.',
      evidence: [
        'src/shared/types/database.ts:34-46',
        'src/app/api/workspaces/[workspaceId]/route.ts:74-95',
        'firestore.rules:15-17',
      ],
    },
    {
      id: 'broad-route-handlers',
      severity: 'high',
      title: 'Major API handlers still combine policy business logic persistence and provider calls',
      currentState: 'Tutor and source upload routes both orchestrate multiple unrelated concerns inside route handlers.',
      targetState: 'Routes validate input and invoke a single use case while policies services repositories and jobs live below the route layer.',
      evidence: [
        'src/app/api/chat/tutor/route.ts:149-266',
        'src/app/api/workspaces/[workspaceId]/sources/route.ts:127-254',
        'src/app/api/workspaces/[workspaceId]/route.ts:125-207',
      ],
    },
    {
      id: 'private-storage-public-url-drift',
      severity: 'high',
      title: 'Source uploads record direct Google Storage URLs despite private-storage intent',
      currentState: 'Uploaded files are saved privately but source records still persist a public-style URL.',
      targetState: 'storage_path is canonical and reads use short-lived signed URLs or a server download policy.',
      evidence: [
        'src/app/api/workspaces/[workspaceId]/sources/route.ts:181-207',
        'storage.rules:1-8',
      ],
    },
    {
      id: 'vector-metadata-contains-full-content',
      severity: 'medium',
      title: 'Vector metadata currently duplicates full chunk content',
      currentState: 'Pinecone metadata stores content directly, making the vector store act as the only durable chunk source.',
      targetState: 'source_chunks becomes canonical for chunk records and vectors reference chunk ids plus lightweight metadata.',
      evidence: [
        'src/shared/lib/rag/vector-store.ts:12-19',
        'src/shared/lib/rag/vector-store.ts:97-107',
        'src/shared/lib/rag/retriever.ts:49-58',
      ],
    },
    {
      id: 'deployment-path-misalignment',
      severity: 'medium',
      title: 'Deployment paths are split between Vercel and Docker without aligned health behavior',
      currentState: 'The repo builds for standalone Docker output, but the Docker healthcheck expects an endpoint that does not exist.',
      targetState: 'Vercel remains the primary app target while Firebase jobs support async work and health endpoints are added in foundation work.',
      evidence: ['next.config.js:11-16', 'vercel.json:1-69', 'Dockerfile:50-54', 'firebase.json:1-15'],
    },
    {
      id: 'testing-surface-gap',
      severity: 'high',
      title: 'Automated coverage is far below product surface area',
      currentState: 'Only session-cookie and webhook helper tests exist in the audited source tree.',
      targetState: 'Release minimums must block on lint type-check unit integration build and smoke e2e coverage for the MVP loop.',
      evidence: [
        'src/shared/lib/auth/session-cookie.test.ts:1-38',
        'src/shared/lib/paystack/webhook-helpers.test.ts:1-61',
      ],
    },
    {
      id: 'ui-shell-is-valuable-but-coupled-to-auth-context',
      severity: 'medium',
      title: 'The app shell and dashboard layout are strong but still depend on the legacy auth context',
      currentState: 'The shell and dashboard provider composition already reflect the target information architecture but are coupled to AuthContext.',
      targetState: 'The rebuild should preserve the shell model while replacing AuthContext with server-backed viewer and entitlement hooks.',
      evidence: [
        'src/app/layout.tsx:38-73',
        'src/app/dashboard/layout.tsx:43-104',
        'src/widgets/AppShell/AppShell.tsx:69-158',
      ],
    },
  ],
};
