/**
 * Centralized RAG configuration and constraints.
 */
export const RAG_CONFIG = {
  // Max characters to send to LLM to prevent context window issues
  MAX_SOURCE_CONTENT_LENGTH: 15000,

  // Storage paths
  STORAGE_SOURCES_PATH: 'sources',

  // Vector search constraints (if applicable)
  MAX_CHUNKS_PER_REQUEST: 50,

  // AI generation defaults
  AI: {
    DEFAULT_TEMPERATURE: 0.7,
    MAX_TOKENS: 4000,
  },
};
