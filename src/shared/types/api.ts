import type { TutorPersonality } from './database';

export interface SignupRequest {
  email: string;
  password: string;
  full_name: string;
  matric_number?: string;
  department?: string;
  level?: number;
  referral_code?: string;
}

export interface SignupResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
  };
  error?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  session?: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
  error?: string;
}

export interface LogoutResponse {
  success: boolean;
}

export interface SessionResponse {
  authenticated: boolean;
  user?: {
    id: string;
    email: string;
    full_name: string;
    subscription_status: string;
    paid_until: string | null;
    preferred_tutor_personality: string;
    current_streak: number;
    total_xp: number;
  };
}

export interface WorkspacesQuery {
  search?: string;
  is_public?: boolean;
  page?: number;
  limit?: number;
}

export interface WorkspaceListItem {
  id: string;
  name: string;
  description: string;
  course_code: string | null;
  university: string | null;
  tutor_personality: string;
  is_public: boolean;
  owner_id: string;
  member_count: number;
  source_count: number;
  flashcard_count: number;
  created_at: string;
  last_accessed: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  total_pages?: number;
}

export interface WorkspacesResponse {
  workspaces: WorkspaceListItem[];
  pagination: PaginationMeta;
}

export interface CreateWorkspaceRequest {
  name: string;
  description?: string;
  course_code?: string;
  university?: string;
  tutor_personality?: TutorPersonality;
  tutor_custom_instructions?: string;
  is_public?: boolean;
}

export interface CreateWorkspaceResponse {
  workspace: {
    id: string;
    name: string;
    description: string;
  };
}

export interface SourceSummary {
  id: string;
  name: string;
  type: string;
  processed: boolean;
  chunk_count: number;
}

export interface SourceListItem {
  id: string;
  workspace_id: string;
  user_id: string;
  type: string;
  file_url: string;
  file_name: string;
  file_size_bytes: number;
  processed: boolean;
  chunk_count: number;
  embedding_status: string;
  created_at: string;
}

export interface SourcesListResponse {
  sources: SourceListItem[];
  pagination: PaginationMeta;
}

export interface FlashcardStats {
  total: number;
  due_today: number;
  mastered: number;
}

export interface RecentSession {
  id: string;
  type: string;
  score: number;
  completed_at: string;
}

export interface WorkspaceDetail {
  id: string;
  name: string;
  description: string;
  course_code: string | null;
  university: string | null;
  tutor_personality: TutorPersonality;
  tutor_custom_instructions: string | null;
  is_public: boolean;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  user_role: 'owner' | 'admin' | 'member' | null;
  sources: SourceSummary[];
  flashcard_stats: FlashcardStats;
  recent_sessions: RecentSession[];
  created_at: string;
  last_accessed: string;
}

export interface WorkspaceDetailResponse {
  workspace: WorkspaceDetail;
}

export interface UpdateWorkspaceRequest {
  name?: string;
  description?: string;
  course_code?: string;
  university?: string;
  tutor_personality?: TutorPersonality;
  tutor_custom_instructions?: string;
  is_public?: boolean;
}

export interface UpdateWorkspaceResponse {
  success: boolean;
  workspace: WorkspaceDetail;
}

export interface DeleteWorkspaceResponse {
  success: boolean;
}

export interface InviteMemberRequest {
  email: string;
  role: 'admin' | 'member';
}

export interface InviteMemberResponse {
  success: boolean;
  invite_id?: string;
  error?: string;
}

export interface WorkspaceMemberItem {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
}

export interface WorkspaceMembersResponse {
  members: WorkspaceMemberItem[];
}

export interface SourcesQuery {
  page?: number;
  limit?: number;
}

export interface UploadSourceRequest {
  file: File;
  type: 'pdf' | 'image' | 'text';
}

export interface UploadSourceResponse {
  source: {
    id: string;
    file_name: string;
    file_size_bytes: number;
    type: string;
    processed: boolean;
    embedding_status: string;
  };
  upload_url?: string;
}

export interface SourceDetail {
  id: string;
  workspace_id: string;
  user_id: string;
  type: string;
  file_url: string;
  file_name: string;
  file_size_bytes: number;
  processed: boolean;
  chunk_count: number;
  embedding_status: string;
  created_at: string;
}

export interface SourceDetailResponse {
  source: SourceDetail;
}

export interface DeleteSourceResponse {
  success: boolean;
}

export interface ProcessSourceResponse {
  success: boolean;
  sourceId: string;
  chunkCount: number;
  error?: string;
}

export interface ReprocessSourceResponse {
  success: boolean;
  job_id: string;
}

export interface FlashcardsQuery {
  tags?: string[];
  due_only?: boolean;
  source_id?: string;
  page?: number;
  limit?: number;
}

export interface FlashcardItem {
  id: string;
  front: string;
  back: string;
  tags: string[];
  difficulty: number;
  next_review: string;
  source?: {
    id: string;
    name: string;
  };
}

export interface FlashcardStatsDetailed {
  total: number;
  due_today: number;
  mastered: number;
  learning: number;
}

export interface FlashcardsResponse {
  flashcards: FlashcardItem[];
  pagination: PaginationMeta;
  stats: FlashcardStatsDetailed;
}

export interface GenerateFlashcardsRequest {
  source_id?: string;
  count?: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  focus_topics?: string[];
}

export interface GeneratedFlashcard {
  id: string;
  front: string;
  back: string;
  tags: string[];
}

export interface GenerateFlashcardsResponse {
  flashcards: GeneratedFlashcard[];
  source_used: string | null;
  generated_count: number;
}

export interface ReviewFlashcardRequest {
  quality: number;
}

export interface ReviewFlashcardResponse {
  success: boolean;
  updated_card: {
    id: string;
    difficulty: number;
    ease_factor: number;
    interval: number;
    next_review: string;
  };
  sm2_debug?: {
    old_interval: number;
    new_interval: number;
    old_ease_factor: number;
    new_ease_factor: number;
  };
}

export interface DueFlashcardsQuery {
  workspace_id?: string;
  limit?: number;
}

export interface DueFlashcardItem {
  id: string;
  front: string;
  back: string;
  workspace_id: string;
  workspace_name: string;
  next_review: string;
}

export interface DueFlashcardsResponse {
  flashcards: DueFlashcardItem[];
  total_due: number;
  due_by_workspace: Record<string, number>;
}

export interface TutorChatRequest {
  workspace_id: string;
  message: string;
  session_id?: string;
  context?: {
    source_ids?: string[];
    include_all_sources?: boolean;
  };
}

export interface TutorSourceUsed {
  id: string;
  name: string;
  relevance_score: number;
}

export interface TutorChatResponse {
  response: string;
  session_id: string;
  message_id: string;
  sources_used?: TutorSourceUsed[];
  suggested_followups?: string[];
}

export interface TutorSessionsQuery {
  workspace_id?: string;
  page?: number;
  limit?: number;
}

export interface TutorSessionItem {
  id: string;
  workspace_id: string;
  workspace_name: string;
  topic_focus: string | null;
  message_count: number;
  started_at: string;
  ended_at: string | null;
  preview: string;
}

export interface TutorSessionsResponse {
  sessions: TutorSessionItem[];
  pagination: PaginationMeta;
}

export interface UpdateTutorSettingsRequest {
  personality?: TutorPersonality;
  custom_instructions?: string;
}

export interface UpdateTutorSettingsResponse {
  success: boolean;
  settings: {
    personality: TutorPersonality;
    custom_instructions: string | null;
  };
}

export interface GenerateQuizRequest {
  source_ids?: string[];
  question_count?: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  question_types?: Array<'multiple_choice' | 'true_false' | 'short_answer'>;
  focus_topics?: string[];
}

export interface ApiQuizQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options?: Record<string, string>;
  correct_answer: string;
  explanation: string;
  difficulty: string;
  source_reference?: string;
}

export interface QuizDetailQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options?: Record<string, string>;
  difficulty: string;
}

export interface GenerateQuizResponse {
  quiz: {
    id: string;
    workspace_id: string;
    questions: ApiQuizQuestion[];
    total_questions: number;
    estimated_time_minutes: number;
  };
}

export interface QuizDetailResponse {
  quiz: {
    id: string;
    workspace_id: string;
    questions: QuizDetailQuestion[];
    total_questions: number;
    estimated_time_minutes: number;
    created_at: string;
  };
  started: boolean;
  completed: boolean;
}

export interface QuizAnswer {
  question_id: string;
  answer: string;
  time_spent_seconds: number;
}

export interface SubmitQuizRequest {
  answers: QuizAnswer[];
}

export interface QuestionResult {
  question_id: string;
  question_text: string;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation: string;
}

export interface SubmitQuizResponse {
  result: {
    quiz_id: string;
    score: number;
    correct_count: number;
    total_questions: number;
    time_spent_seconds: number;
    question_results: QuestionResult[];
    xp_earned: number;
  };
}

export interface AIGenerateFlashcardsRequest {
  content: string;
  count?: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
}

export interface AIGeneratedFlashcard {
  front: string;
  back: string;
  tags: string[];
}

export interface AIGenerateFlashcardsResponse {
  flashcards: AIGeneratedFlashcard[];
}

export interface AIGenerateQuizRequest {
  content: string;
  question_count?: number;
  question_types?: Array<'multiple_choice' | 'true_false' | 'short_answer'>;
}

export interface AIGeneratedQuestion {
  question_text: string;
  question_type: string;
  options?: Record<string, string>;
  correct_answer: string;
  explanation: string;
}

export interface AIGenerateQuizResponse {
  questions: AIGeneratedQuestion[];
}

export interface AIGenerateSummaryRequest {
  content: string;
  max_length?: number;
  style?: 'brief' | 'detailed' | 'bullet_points';
}

export interface AIGenerateSummaryResponse {
  summary: string;
  key_points: string[];
  topics_covered: string[];
}

export interface AIExplainRequest {
  content: string;
  context?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
}

export interface AIExplainResponse {
  explanation: string;
  analogies?: string[];
  related_concepts?: string[];
}

export interface CoursesQuery {
  department?: string;
  level?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CourseItem {
  id: string;
  code: string;
  title: string;
  department: string;
  level: number;
  total_questions: number;
  years_available: number[];
}

export interface CoursesResponse {
  courses: CourseItem[];
  pagination: PaginationMeta;
}

export interface TopicItem {
  id: string;
  name: string;
  question_count: number;
}

export interface CourseDetail {
  id: string;
  code: string;
  title: string;
  description: string;
  department: string;
  level: number;
  total_questions: number;
  years_available: number[];
  topics: TopicItem[];
}

export interface CourseDetailResponse {
  course: CourseDetail;
}

export interface QuestionsQuery {
  year?: number;
  semester?: string;
  topic_id?: string;
  page?: number;
  limit?: number;
}

export interface QuestionItem {
  id: string;
  question_number: number;
  sub_question: string | null;
  question_text: string;
  question_image_url: string | null;
  topic: string;
  marks: number | null;
  has_explanation: boolean;
}

export interface QuestionsResponse {
  questions: QuestionItem[];
  pagination: PaginationMeta;
}

export interface QuestionDetail {
  id: string;
  course: {
    id: string;
    code: string;
    title: string;
  };
  year: number;
  semester: string;
  question_number: number;
  sub_question: string | null;
  question_text: string;
  question_image_url: string | null;
  topic: string;
  marks: number | null;
  difficulty: string | null;
}

export interface ExplanationDetail {
  explanation_text: string;
  step_by_step: Array<{ step: number; content: string }>;
  key_concepts: string[];
}

export interface QuestionDetailResponse {
  question: QuestionDetail;
  explanation?: ExplanationDetail;
  can_view_explanation: boolean;
  is_bookmarked: boolean;
}

export interface ExplanationResponse {
  explanation: {
    explanation_text: string;
    step_by_step: Array<{ step: number; content: string }>;
    key_concepts: string[];
    formulas_used: string[];
  };
  is_free_view: boolean;
  remaining_free_views: number;
}

export interface CreatePracticeSessionRequest {
  workspace_id?: string;
  course_id?: string;
  topic_ids?: string[];
  question_count?: number;
  time_limit_minutes?: number;
  session_type: 'quiz' | 'flashcard' | 'exam_simulator' | 'custom' | 'timed' | 'untimed' | 'review';
}

export interface PracticeQuestionItem {
  id: string;
  question_number: number;
  question_text: string;
  question_image_url: string | null;
  options?: Record<string, string>;
}

export interface CreatePracticeSessionResponse {
  session: {
    id: string;
    questions: PracticeQuestionItem[];
    total_questions: number;
    time_limit_minutes: number | null;
  };
}

export interface SubmitAnswerRequest {
  question_id: string;
  answer: string;
  selected_option?: string;
  time_spent_seconds: number;
}

export interface SubmitAnswerResponse {
  is_correct: boolean;
  correct_answer?: string;
  explanation?: string;
}

export interface CompleteSessionResponse {
  session: {
    id: string;
    score: number;
    correct_count: number;
    incorrect_count: number;
    skipped_count: number;
    total_time_seconds: number;
    topic_breakdown: Record<string, { correct: number; total: number }>;
    xp_earned: number;
  };
}

export interface InitializePaymentRequest {
  subscription_tier: 'premium' | 'bulk';
  bulk_count?: number;
  referral_code?: string;
}

export interface InitializePaymentResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
  amount: number;
}

export interface VerifyPaymentResponse {
  success: boolean;
  status: string;
  subscription_status: string;
  paid_until: string;
}

export interface PaystackWebhookPayload {
  event: string;
  data: {
    id: number;
    reference: string;
    status: string;
    amount: number;
    currency: string;
    channel: string;
    customer: {
      email: string;
    };
    metadata: Record<string, unknown>;
    paid_at: string;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  matric_number: string | null;
  department: string | null;
  level: number | null;
  subscription_status: string;
  subscription_tier: string;
  paid_until: string | null;
  free_explanations_used: number;
  free_explanations_limit: number;
  free_ai_queries_used: number;
  free_ai_queries_limit: number;
  current_streak: number;
  total_xp: number;
  preferred_tutor_personality: string;
  referral_code: string;
  referral_credits: number;
}

export interface ProfileResponse {
  profile: UserProfile;
}

export interface UpdateProfileRequest {
  full_name?: string;
  matric_number?: string;
  department?: string;
  level?: number;
  preferred_tutor_personality?: TutorPersonality;
}

export interface UpdateProfileResponse {
  success: boolean;
  profile: UserProfile;
}

export interface RecentWorkspace {
  id: string;
  name: string;
  last_accessed: string;
  flashcard_count: number;
}

export interface RecentActivity {
  type: 'question_view' | 'practice_session' | 'flashcard_review' | 'tutor_session' | 'payment';
  data: Record<string, unknown>;
  created_at: string;
}

export interface DashboardStats {
  workspaces_count: number;
  flashcards_total: number;
  flashcards_due_today: number;
  questions_viewed: number;
  practice_sessions: number;
  average_score: number | null;
  current_streak: number;
  total_xp: number;
}

export interface DashboardSubscription {
  status: string;
  paid_until: string | null;
  days_remaining: number | null;
}

export interface DashboardResponse {
  stats: DashboardStats;
  recent_workspaces: RecentWorkspace[];
  recent_activity: RecentActivity[];
  subscription: DashboardSubscription;
  ai_queries_remaining: number;
}

export interface BookmarkItem {
  id: string;
  question: {
    id: string;
    question_number: number;
    question_text: string;
    course: { code: string; title: string };
  };
  note: string | null;
  created_at: string;
}

export interface BookmarksResponse {
  bookmarks: BookmarkItem[];
}

export interface AddBookmarkRequest {
  question_id: string;
  note?: string;
}

export interface AddBookmarkResponse {
  success: boolean;
  bookmark_id: string;
}

export interface DeleteBookmarkResponse {
  success: boolean;
}

export interface CreateCourseRequest {
  code: string;
  title: string;
  description?: string;
  department?: string;
  level: number;
  credit_units?: number;
}

export interface CreateCourseResponse {
  course: {
    id: string;
    code: string;
    title: string;
  };
}

export interface CreateQuestionRequest {
  course_id: string;
  year: number;
  semester: string;
  question_number: number;
  sub_question?: string;
  question_text: string;
  question_image_url?: string;
  topic?: string;
  marks?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  question_type?: 'theory' | 'objective';
  options?: Record<string, string>;
  correct_option?: string;
}

export interface CreateQuestionResponse {
  question: {
    id: string;
    question_number: number;
  };
}

export interface BatchCreateQuestionsRequest {
  course_id: string;
  questions: CreateQuestionRequest[];
}

export interface BatchCreateQuestionsResponse {
  created: number;
  failed: number;
  questions: Array<{ id: string; question_number: number }>;
}

export interface GenerateExplanationsRequest {
  course_id?: string;
  question_ids?: string[];
  regenerate?: boolean;
}

export interface GenerateExplanationsResponse {
  queued: number;
  job_id: string;
}

export interface AdminUserStats {
  total: number;
  active_today: number;
  paid: number;
  free: number;
}

export interface AdminContentStats {
  workspaces: number;
  sources: number;
  flashcards: number;
  courses: number;
  questions: number;
  explanations_generated: number;
  explanations_pending: number;
}

export interface AdminRevenueStats {
  total_kobo: number;
  this_month_kobo: number;
  this_week_kobo: number;
}

export interface AdminPracticeStats {
  total_sessions: number;
  completed_sessions: number;
  average_score: number;
}

export interface AdminAIUsageStats {
  total_queries: number;
  tutor_sessions: number;
  flashcards_generated: number;
  quizzes_generated: number;
}

export interface AdminStatsResponse {
  users: AdminUserStats;
  content: AdminContentStats;
  revenue: AdminRevenueStats;
  practice: AdminPracticeStats;
  ai_usage: AdminAIUsageStats;
}

export interface ApiExam {
  id: string;
  workspace_id: string;
  title: string;
  question_count: number;
  time_limit_minutes: number;
  questions: ApiExamQuestion[];
  status: 'in_progress' | 'completed' | 'expired';
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface ApiExamQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options?: Record<string, string>;
  difficulty: string;
}

export interface GenerateExamRequest {
  source_ids?: string[];
  question_count?: number;
  time_limit_minutes?: number;
  question_types?: Array<'multiple_choice' | 'true_false' | 'short_answer'>;
  focus_topics?: string[];
}

export interface GenerateExamResponse {
  exam: {
    exam_id: string;
    id: string;
    question_count: number;
    time_limit_minutes: number;
    questions: ApiExamQuestion[];
  };
  generated_count: number;
}

export interface ExamDetailResponse {
  exam: {
    id: string;
    exam_id: string;
    workspace_id: string;
    title: string;
    question_count: number;
    time_limit_minutes: number;
    questions: ApiExamQuestion[];
    status: 'in_progress' | 'completed' | 'expired';
    created_at: string;
    started_at?: string;
    completed_at?: string;
  };
}

export interface ExamAnswerInput {
  question_id: string;
  answer: string;
}

export interface SubmitExamRequest {
  answers: Record<string, string>;
  time_spent_seconds: number;
}

export interface ExamQuestionResult {
  question_id: string;
  question_text: string;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation: string;
  difficulty: string;
}

export interface SubmitExamResponse {
  result: {
    exam_id: string;
    score: number;
    correct_count: number;
    total_questions: number;
    time_spent_seconds: number;
    question_results: ExamQuestionResult[];
    xp_earned: number;
  };
}

export interface DashboardStats {
  total_study_time_minutes: number;
  study_time_this_week: number;
  study_time_today: number;
  total_flashcards_reviewed: number;
  total_quizzes_completed: number;
  total_exams_completed: number;
  average_quiz_score: number;
  average_exam_score: number;
  current_streak: number;
  longest_streak: number;
  total_xp: number;
  level: number;
  xp_to_next_level: number;
}

export interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_study_date: string | null;
  streak_dates: string[];
  today_completed: boolean;
}

export interface ActivityData {
  date: string;
  study_time_minutes: number;
  flashcards_reviewed: number;
  quizzes_completed: number;
  exams_completed: number;
  xp_earned: number;
}

export interface WorkspaceAnalytics {
  workspace_id: string;
  workspace_name: string;
  total_study_time_minutes: number;
  total_flashcards_reviewed: number;
  flashcards_mastered: number;
  quizzes_completed: number;
  average_quiz_score: number;
  exams_completed: number;
  average_exam_score: number;
  last_activity: string | null;
}

export interface AnalyticsDashboardResponse {
  stats: DashboardStats;
  streak: StreakData;
  recent_activity: ActivityData[];
  weekly_activity: ActivityData[];
}

export interface AnalyticsStreaksResponse {
  streak: StreakData;
}

export interface AnalyticsActivityResponse {
  activity: ActivityData[];
  period: 'week' | 'month' | 'year';
}

export interface AnalyticsWorkspaceResponse {
  workspace: WorkspaceAnalytics;
}

export type ApiStudyPlanActivityType = 'flashcard' | 'quiz' | 'practice' | 'review' | 'tutor';

export interface ApiStudyPlanItem {
  date: string;
  topic: string;
  duration_minutes: number;
  activity_type: ApiStudyPlanActivityType;
  completed: boolean;
}

export interface ApiStudyPlan {
  id: string;
  workspace_id: string;
  title: string;
  exam_date: string;
  daily_study_hours: number;
  topics_to_cover: string[];
  generated_schedule: ApiStudyPlanItem[];
  created_at: string;
  status: string;
  progress?: number;
}

export interface CreateStudyPlanRequest {
  workspace_id: string;
  exam_date: string;
  daily_study_hours: number;
  focus_topics?: string[];
}

export interface CreateStudyPlanResponse {
  plan: ApiStudyPlan;
}

export interface StudyPlanListResponse {
  plans: ApiStudyPlan[];
}

export interface UpdateStudyPlanItemRequest {
  completed: boolean;
}

export interface UpdateStudyPlanItemResponse {
  success: boolean;
  item: ApiStudyPlanItem;
}

export interface ApiWorkspaceMember {
  id: string;
  user_id: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
}

export interface CreateInviteRequest {
  role: 'admin' | 'member';
}

export interface CreateInviteResponse {
  invite_code: string;
  invite_url: string;
  expires_at: string;
}

export interface JoinWorkspaceRequest {
  invite_code: string;
}

export interface JoinWorkspaceResponse {
  success: boolean;
  workspace_id: string;
}

export interface UpdateMemberRoleRequest {
  role: 'admin' | 'member';
}

export interface AddMemberRequest {
  email: string;
  role: 'admin' | 'member';
}

export interface WorkspaceMembersResponse {
  members: ApiWorkspaceMember[];
}

export interface ExportFlashcardsRequest {
  workspace_id: string;
  source_id?: string;
  format: 'pdf' | 'anki';
  topic?: string;
}

export interface ExportFlashcardsResponse {
  success: boolean;
  file_url?: string;
  file_name?: string;
  error?: string;
}

export interface ShareWhatsAppRequest {
  content: string;
  type: 'flashcard' | 'quiz' | 'explanation';
}

export interface ShareWhatsAppResponse {
  success: boolean;
  share_url?: string;
  error?: string;
}
