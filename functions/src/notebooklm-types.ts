// Vendored copy of src/shared/lib/notebooklm/types.ts
// Duplicated here so the Cloud Function is self-contained (no Next.js deps)

export interface UserNotebook {
  id: string;
  app_user_id: string;
  workspace_id: string;
  notebook_id: string;
  profile_name: string;
  title: string;
  created_at: FirebaseFirestore.Timestamp;
}

export interface NlmAccount {
  profile_name: string;
  email: string;
  is_active: boolean;
  daily_queries_used: number;
  daily_audio_used: number;
  daily_video_used: number;
  daily_quota_queries: number;
  daily_quota_audio: number;
  daily_quota_video: number;
  last_reset_date: string;
}

export interface NlmJob {
  job_id: string;
  app_user_id: string;
  workspace_id: string;
  notebook_id: string;
  profile_name: string;
  job_type: 'audio' | 'video' | 'infographic';
  status: 'pending' | 'processing' | 'done' | 'error';
  result_url: string | null;
  error_message: string | null;
  retry_count: number;
  created_at: FirebaseFirestore.Timestamp;
  completed_at: FirebaseFirestore.Timestamp | null;
}
