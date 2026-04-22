import { describe, expect, it } from 'vitest';

import {
  CreateWorkspaceRequestSchema,
  UpdateWorkspaceRequestSchema,
  TUTOR_PERSONALITIES,
} from '../contracts/workspace';

describe('workspace contracts', () => {
  describe('CreateWorkspaceRequestSchema', () => {
    it('validates a minimal valid request', () => {
      const result = CreateWorkspaceRequestSchema.safeParse({
        name: 'My Study Space',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('My Study Space');
        expect(result.data.is_public).toBe(false);
      }
    });

    it('validates a full request with all fields', () => {
      const result = CreateWorkspaceRequestSchema.safeParse({
        name: 'Advanced Physics',
        description: 'Study materials for PHY 301',
        tutor_personality: 'mentor',
        is_public: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Advanced Physics');
        expect(result.data.description).toBe('Study materials for PHY 301');
        expect(result.data.tutor_personality).toBe('mentor');
        expect(result.data.is_public).toBe(true);
      }
    });

    it('rejects empty name', () => {
      const result = CreateWorkspaceRequestSchema.safeParse({
        name: '',
      });
      expect(result.success).toBe(false);
    });

    it('rejects name exceeding max length', () => {
      const result = CreateWorkspaceRequestSchema.safeParse({
        name: 'A'.repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid tutor_personality', () => {
      const result = CreateWorkspaceRequestSchema.safeParse({
        name: 'Test',
        tutor_personality: 'invalid_personality',
      });
      expect(result.success).toBe(false);
    });

    it('accepts all valid tutor personalities', () => {
      for (const personality of TUTOR_PERSONALITIES) {
        const result = CreateWorkspaceRequestSchema.safeParse({
          name: 'Test',
          tutor_personality: personality,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('UpdateWorkspaceRequestSchema', () => {
    it('validates partial updates', () => {
      const result = UpdateWorkspaceRequestSchema.safeParse({
        name: 'Updated Name',
      });
      expect(result.success).toBe(true);
    });

    it('allows empty object (no updates)', () => {
      const result = UpdateWorkspaceRequestSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('rejects invalid tutor_personality in update', () => {
      const result = UpdateWorkspaceRequestSchema.safeParse({
        tutor_personality: 'hacker',
      });
      expect(result.success).toBe(false);
    });
  });
});
