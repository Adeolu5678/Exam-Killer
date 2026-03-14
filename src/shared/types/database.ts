export type TutorPersonality = 'mentor' | 'drill' | 'peer' | 'professor' | 'storyteller' | 'coach';

export type SubscriptionStatus = 'free' | 'premium' | 'active';

export type SourceType = 'pdf' | 'image' | 'text' | 'link' | 'note';

export type EmbeddingStatus = 'pending' | 'completed' | 'failed';

export type WorkspaceRole = 'owner' | 'admin' | 'member';

export type SessionType = 'quiz' | 'flashcard' | 'exam_simulator' | 'custom';

export type ExplanationStatus = 'pending' | 'completed';

export type PaymentStatus = 'success' | 'failed' | 'pending';

export interface User {
  uid: string;
  email: string;
  full_name: string;
  subscription_status: SubscriptionStatus;
  subscription_tier?: string;
  paid_until?: Date;
  free_explanations_used: number;
  free_ai_queries_used: number;
  free_ai_queries_limit: number;
  current_streak: number;
  total_xp: number;
  preferred_tutor_personality: TutorPersonality;
  created_at: Date;
}

export interface Workspace {
  workspace_id: string;
  user_id: string;
  name: string;
  description: string;
  course_code?: string;
  university?: string;
  tutor_personality: TutorPersonality;
  tutor_custom_instructions?: string;
  is_public: boolean;
  created_at: Date;
  last_accessed: Date;
}

export interface Source {
  source_id: string;
  workspace_id: string;
  user_id: string;
  type: SourceType;
  file_url: string;
  file_name: string;
  file_size_bytes: number;
  processed: boolean;
  chunk_count: number;
  embedding_status: EmbeddingStatus;
  created_at: Date;
}

export interface Flashcard {
  flashcard_id: string;
  workspace_id: string;
  source_id?: string;
  front: string;
  back: string;
  tags: string[];
  difficulty: number;
  ease_factor: number;
  interval: number;
  next_review: Date;
  review_count: number;
  last_review?: Date;
  created_at: Date;
}

export interface Quiz {
  quiz_id: string;
  workspace_id: string;
  user_id: string;
  source_id?: string;
  questions: QuizQuestion[];
  total_questions: number;
  completed: boolean;
  score?: number;
  correct_count?: number;
  time_spent_seconds?: number;
  created_at: Date;
  completed_at?: Date;
}

export interface QuizQuestion {
  question_id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: Record<string, string>;
  correct_answer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  user_answer?: string;
  is_correct?: boolean;
  time_spent_seconds?: number;
}

export interface TutorMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface TutorSession {
  session_id: string;
  workspace_id: string;
  user_id: string;
  messages: TutorMessage[];
  topic_focus?: string;
  started_at: Date;
  ended_at?: Date;
  message_count: number;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  invited_by: string;
  joined_at: Date;
}

export interface PracticeQuestion {
  question_id: string;
  user_answer: string;
  is_correct: boolean;
  time_spent_seconds: number;
}

export interface TopicBreakdown {
  [topic: string]: {
    correct: number;
    total: number;
  };
}

export interface PracticeSession {
  session_id: string;
  workspace_id: string;
  user_id: string;
  session_type: SessionType;
  score: number;
  total_questions: number;
  correct_count: number;
  questions: PracticeQuestion[];
  topic_breakdown: TopicBreakdown;
  duration_seconds: number;
  completed_at: Date;
}

export interface VectorChunkMetadata {
  page_number?: number;
  section?: string;
  source_type: string;
}

export interface VectorChunk {
  chunk_id: string;
  source_id: string;
  workspace_id: string;
  content: string;
  chunk_index: number;
  embedding_id: string;
  metadata: VectorChunkMetadata;
  created_at: Date;
}

export interface Course {
  course_id: string;
  code: string;
  title: string;
  department?: string;
  level?: number;
  is_active: boolean;
  created_at: Date;
}

export interface Topic {
  topic_id: string;
  course_id: string;
  name: string;
  question_count: number;
}

export interface Question {
  question_id: string;
  course_id: string;
  topic_id: string;
  year: number;
  semester: string;
  question_number: number;
  question_text: string;
  question_image_url?: string;
  explanation_status: ExplanationStatus;
  created_at: Date;
}

export interface StepByStepItem {
  step: number;
  content: string;
}

export interface Explanation {
  explanation_id: string;
  question_id: string;
  explanation_text: string;
  step_by_step: StepByStepItem[];
  formulas_used: string[];
  model_used: string;
  generated_at: Date;
}

export interface Payment {
  payment_id: string;
  user_id: string;
  amount_kobo: number;
  status: PaymentStatus;
  initiated_at: Date;
}

export interface Exam {
  exam_id: string;
  workspace_id: string;
  user_id: string;
  title: string;
  question_count: number;
  time_limit_minutes: number;
  questions: ExamQuestion[];
  status: 'in_progress' | 'completed' | 'expired';
  created_at: Date;
  started_at?: Date;
  completed_at?: Date;
}

export interface ExamQuestion {
  question_id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: Record<string, string>;
  correct_answer: string;
  explanation: string;
  difficulty: string;
}

export interface ExamAttempt {
  attempt_id: string;
  exam_id: string;
  user_id: string;
  score: number;
  correct_count: number;
  total_questions: number;
  time_taken_seconds: number;
  answers: ExamAnswer[];
  completed_at: Date;
  xp_earned: number;
}

export interface ExamAnswer {
  question_id: string;
  user_answer: string;
  is_correct: boolean;
}

export type StudyPlanStatus = 'active' | 'completed' | 'cancelled';
export type StudyPlanActivityType = 'flashcard' | 'quiz' | 'practice' | 'review' | 'tutor';

export interface StudyPlanItem {
  date: Date;
  topic: string;
  duration_minutes: number;
  activity_type: StudyPlanActivityType;
  completed: boolean;
}

export interface StudyPlan {
  plan_id: string;
  user_id: string;
  workspace_id: string;
  title: string;
  exam_date: Date;
  daily_study_hours: number;
  topics_to_cover: string[];
  generated_schedule: StudyPlanItem[];
  created_at: Date;
  status: StudyPlanStatus;
}
