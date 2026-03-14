const MOCK_MODE_ENABLED = !process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'mock';

const MOCK_FLASHCARDS = `[
  {"front": "What is the capital of France?", "back": "Paris", "tags": ["geography", "europe"]},
  {"front": "What is 2 + 2?", "back": "4", "tags": ["math", "basic"]},
  {"front": "What is photosynthesis?", "back": "The process by which plants convert sunlight into energy", "tags": ["science", "biology"]},
  {"front": "Who wrote Romeo and Juliet?", "back": "William Shakespeare", "tags": ["literature", "shakespeare"]},
  {"front": "What is the chemical symbol for water?", "back": "H2O", "tags": ["chemistry", "science"]}
]`;

const MOCK_QUIZ_QUESTIONS = `[
  {"type": "multiple_choice", "question": "What is the capital of France?", "options": ["London", "Paris", "Berlin", "Madrid"], "correct_answer": "Paris", "explanation": "Paris is the capital and largest city of France."},
  {"type": "true_false", "question": "The Earth is flat.", "options": ["True", "False"], "correct_answer": "False", "explanation": "The Earth is an oblate spheroid, not flat."},
  {"type": "multiple_choice", "question": "What is the largest planet in our solar system?", "options": ["Earth", "Mars", "Jupiter", "Saturn"], "correct_answer": "Jupiter", "explanation": "Jupiter is the largest planet in our solar system."},
  {"type": "short_answer", "question": "What gas do plants absorb from the atmosphere?", "correct_answer": "Carbon dioxide (CO2)", "explanation": "Plants absorb carbon dioxide during photosynthesis."},
  {"type": "multiple_choice", "question": "Who painted the Mona Lisa?", "options": ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Michelangelo"], "correct_answer": "Leonardo da Vinci", "explanation": "Leonardo da Vinci painted the Mona Lisa in the early 16th century."}
]`;

const MOCK_SUMMARY = `{
  "title": "Introduction to Computer Science",
  "main_points": [
    "Understanding basic programming concepts",
    "Data structures and algorithms",
    "Web development fundamentals",
    "Database management basics"
  ],
  "key_terms": [
    {"term": "Algorithm", "definition": "A step-by-step procedure for solving a problem"},
    {"term": "Variable", "definition": "A container for storing data values"},
    {"term": "Function", "definition": "A reusable block of code that performs a specific task"}
  ]
}`;

const MOCK_TUTOR_RESPONSE = `Hello! I'm currently running in demo mode since OpenAI is not configured. This means you're seeing sample responses to help you understand how the AI tutoring feature works. 

To enable full AI capabilities, please configure your OpenAI API key in the environment variables. Once configured, I'll be able to provide personalized tutoring, answer questions about your study materials, and offer tailored learning assistance based on your specific needs.

Feel free to explore the demo features in the meantime!`;

export function getMockFlashcards(count: number): string {
  return MOCK_FLASHCARDS;
}

export function getMockQuizQuestions(count: number): string {
  return MOCK_QUIZ_QUESTIONS;
}

export function getMockSummary(): string {
  return MOCK_SUMMARY;
}

export function getMockTutorResponse(): string {
  return MOCK_TUTOR_RESPONSE;
}

export function getMockEmbedding(): number[] {
  return Array(1536)
    .fill(0)
    .map(() => Math.random() * 2 - 1);
}

export { MOCK_MODE_ENABLED };
