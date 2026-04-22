import { describe, expect, it } from 'vitest';

import {
  SourceSchema,
  CreateSourceRequestSchema,
  PROCESSING_STATUS_VALUES,
  normalizeSignedUrlExpiryMinutes,
  DEFAULT_SIGNED_URL_EXPIRY_MINUTES,
  MAX_SIGNED_URL_EXPIRY_MINUTES,
  MIN_SIGNED_URL_EXPIRY_MINUTES,
  type ProcessingStatus,
} from '../contracts/source';

describe('source contracts', () => {
  describe('CreateSourceRequestSchema', () => {
    it('validates required fields', () => {
      const result = CreateSourceRequestSchema.safeParse({
        workspace_id: 'ws_123',
        filename: 'notes.pdf',
        content_type: 'application/pdf',
        size_bytes: 1024000,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.workspace_id).toBe('ws_123');
        expect(result.data.filename).toBe('notes.pdf');
        expect(result.data.content_type).toBe('application/pdf');
        expect(result.data.size_bytes).toBe(1024000);
      }
    });

    it('rejects zero-byte files', () => {
      const result = CreateSourceRequestSchema.safeParse({
        workspace_id: 'ws_123',
        filename: 'empty.pdf',
        content_type: 'application/pdf',
        size_bytes: 0,
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing workspace_id', () => {
      const result = CreateSourceRequestSchema.safeParse({
        filename: 'notes.pdf',
        content_type: 'application/pdf',
        size_bytes: 1024,
      });
      expect(result.success).toBe(false);
    });

    it('accepts optional source_type', () => {
      const result = CreateSourceRequestSchema.safeParse({
        workspace_id: 'ws_123',
        filename: 'notes.pdf',
        content_type: 'application/pdf',
        size_bytes: 1024,
        source_type: 'notes',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.source_type).toBe('notes');
      }
    });
  });

  describe('SourceSchema', () => {
    const validSource = {
      id: 'src_abc123',
      workspace_id: 'ws_123',
      user_id: 'user_456',
      filename: 'chapter1.pdf',
      original_filename: 'Chapter 1 - Introduction.pdf',
      content_type: 'application/pdf',
      size_bytes: 2048000,
      storage_path: 'workspaces/ws_123/sources/src_abc123/chapter1.pdf',
      embedding_status: 'completed' as ProcessingStatus,
      processed: true,
      created_at: new Date().toISOString(),
    };

    it('validates a complete source object', () => {
      const result = SourceSchema.safeParse(validSource);
      expect(result.success).toBe(true);
    });

    it('validates all processing status values', () => {
      for (const status of PROCESSING_STATUS_VALUES) {
        const result = SourceSchema.safeParse({
          ...validSource,
          embedding_status: status,
        });
        expect(result.success).toBe(true);
      }
    });

    it('rejects invalid embedding_status', () => {
      const result = SourceSchema.safeParse({
        ...validSource,
        embedding_status: 'unknown_status',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('normalizeSignedUrlExpiryMinutes', () => {
    it('returns default for invalid values', () => {
      expect(normalizeSignedUrlExpiryMinutes(undefined)).toBe(DEFAULT_SIGNED_URL_EXPIRY_MINUTES);
      expect(normalizeSignedUrlExpiryMinutes(Number.NaN)).toBe(DEFAULT_SIGNED_URL_EXPIRY_MINUTES);
    });

    it('clamps to allowed range', () => {
      expect(normalizeSignedUrlExpiryMinutes(0)).toBe(MIN_SIGNED_URL_EXPIRY_MINUTES);
      expect(normalizeSignedUrlExpiryMinutes(500)).toBe(MAX_SIGNED_URL_EXPIRY_MINUTES);
    });

    it('normalizes finite integer-like values', () => {
      expect(normalizeSignedUrlExpiryMinutes(17.9)).toBe(17);
      expect(normalizeSignedUrlExpiryMinutes(15)).toBe(15);
    });
  });
});
