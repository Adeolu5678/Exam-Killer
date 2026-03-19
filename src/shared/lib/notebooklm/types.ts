export interface UserNotebook {
  id: string; // Firestore doc ID (auto)
  app_user_id: string; // Firebase UID of the student
  workspace_id: string; // Exam-Killer workspace ID this notebook belongs to
  notebook_id: string; // NotebookLM notebook ID
  profile_name: string; // Which pool account owns this notebook
  title: string; // Notebook title (mirrors workspace name)
  created_at: any;
}

export interface NlmAccount {
  profile_name: string; // "nlm_01" — matches the CLI profile name exactly
  email: string; // The Google account email, for your reference
  is_active: boolean; // true
  daily_queries_used: number; // 0
  daily_audio_used: number; // 0
  daily_video_used: number; // 0
  daily_quota_queries: number; // 480  (buffer below 500 hard limit)
  daily_quota_audio: number; // 18   (buffer below 20 hard limit)
  daily_quota_video: number; // 8
  last_reset_date: string; // "YYYY-MM-DD" format
}
export interface NlmJob {
  job_id: string; // Firestore document ID (auto-generated)
  app_user_id: string; // Firebase UID of the requesting student
  workspace_id: string; // Exam-Killer workspace ID
  notebook_id: string; // NotebookLM notebook ID
  profile_name: string; // Which pool account to use
  job_type: 'audio' | 'video' | 'infographic';
  status: 'pending' | 'processing' | 'done' | 'error';
  result_url: string | null; // Firebase Storage URL, populated when done
  error_message: string | null; // Populated if status === 'error'
  retry_count: number; // Max 2 retries
  created_at: any; // FirebaseFirestore.Timestamp (using any here to avoid import issues in shared lib, it's cast to Timestamp in server code)
  completed_at: any | null;
}
