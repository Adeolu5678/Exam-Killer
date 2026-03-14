// =============================================================================
// features/tutor/index.ts  —  PUBLIC API
// Layer: features → tutor
// Rule: Consumers may ONLY import from this file.
//   ✅  import { ChatInterface, useTutorStore } from '@/features/tutor'
//   ❌  import { ChatInterface } from '@/features/tutor/ui/ChatInterface'
// =============================================================================

// ── UI components ──────────────────────────────────────────────────────────
export { ChatInterface } from './ui/ChatInterface';
export { MessageBubble, MessageBubbleSkeleton } from './ui/MessageBubble';
export { PersonalitySelector } from './ui/PersonalitySelector';

// ── Model hooks ────────────────────────────────────────────────────────────
export { useConversation, useSendMessage } from './model/useTutor';

// ── Zustand store ──────────────────────────────────────────────────────────
export { useTutorStore } from './model/tutorStore';

// ── Types ──────────────────────────────────────────────────────────────────
export type { ChatMessage, CitationChip, TutorPersonalityId } from './model/types';
export { TUTOR_PERSONALITIES, PERSONALITY_THEMES } from './model/types';

// ── API functions ──────────────────────────────────────────────────────────
export { sendMessage, sendMessageStream, fetchConversationHistory } from './api/tutorApi';
export type {
  SendMessagePayload,
  SendMessageResponse,
  ConversationHistoryResponse,
} from './api/tutorApi';
