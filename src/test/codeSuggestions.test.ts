import { describe, it, expect } from 'vitest'
import {
  suggestNextCode,
  suggestNextCodeWithDetails,
  calculateSuggestions,
  calculateSuggestionsWithDetails
} from '../utils/codeSuggestions'

describe('codeSuggestions', () => {
  describe('suggestNextCode', () => {
    it('should return next available code', () => {
      const usedCodes = new Set(['142']);
      expect(suggestNextCode('142', usedCodes)).toBe('143');
    })

    it('should skip used codes', () => {
      const usedCodes = new Set(['142', '143', '144']);
      expect(suggestNextCode('142', usedCodes)).toBe('145');
    })

    it('should return null when code ends with 9', () => {
      expect(suggestNextCode('149', new Set())).toBeNull();
    })

    it('should return null when range is saturated', () => {
      const usedCodes = new Set(['143', '144', '145', '146', '147', '148', '149']);
      expect(suggestNextCode('142', usedCodes)).toBeNull();
    })

    it('should return null for non-numeric code', () => {
      expect(suggestNextCode('ABC', new Set())).toBeNull();
    })

    it('should return null for empty string', () => {
      expect(suggestNextCode('', new Set())).toBeNull();
    })

    it('should handle single-digit codes', () => {
      expect(suggestNextCode('1', new Set(['1']))).toBe('2');
    })
  })

  describe('suggestNextCodeWithDetails', () => {
    it('should return code with increment reason', () => {
      const result = suggestNextCodeWithDetails('142', new Set(['142']));
      expect(result.code).toBe('143');
      expect(result.reason).toContain('+1');
      expect(result.reason).toContain('142');
    })

    it('should return blocked codes details with cncj source', () => {
      const usedCodes = new Set(['143', '144']);
      const cncjCodes = new Set(['143']);
      const result = suggestNextCodeWithDetails('142', usedCodes, cncjCodes);
      // 143 is blocked (cncj), 144 is blocked (doublon), so next is 145
      expect(result.code).toBe('145');
      expect(result.triedCodes).toEqual(['143', '144']);
      expect(result.blockedCodesDetails).toEqual([
        { code: '143', source: 'cncj' },
        { code: '144', source: 'doublon' }
      ]);
    })

    it('should identify client source for blocking', () => {
      const usedCodes = new Set(['143']);
      const cncjCodes = new Set<string>();
      const clientCodes = new Set(['143']);
      const result = suggestNextCodeWithDetails('142', usedCodes, cncjCodes, clientCodes);
      expect(result.code).toBe('144');
      expect(result.blockedCodesDetails?.[0].source).toBe('client');
    })

    it('should return blockedBy both when mixed blockers saturate range', () => {
      const usedCodes = new Set(['143', '144', '145', '146', '147', '148', '149']);
      const cncjCodes = new Set(['143']);
      const clientCodes = new Set(['144']);
      const result = suggestNextCodeWithDetails('142', usedCodes, cncjCodes, clientCodes);
      expect(result.code).toBeNull();
      expect(result.blockedBy).toBe('both');
    })

    it('should return null with reason for code ending in 9', () => {
      const result = suggestNextCodeWithDetails('149', new Set());
      expect(result.code).toBeNull();
      expect(result.reason).toContain('finit par 9');
    })

    it('should return saturated range message', () => {
      const usedCodes = new Set(['143', '144', '145', '146', '147', '148', '149']);
      const result = suggestNextCodeWithDetails('142', usedCodes);
      expect(result.code).toBeNull();
      expect(result.reason).toContain('saturée');
      expect(result.triedCodes).toHaveLength(7);
    })
  })

  describe('calculateSuggestions', () => {
    it('should keep original code for first duplicate in group', () => {
      const duplicates = [
        { id: 'a-1', number: '142' },
        { id: 'a-2', number: '142' }
      ];
      const existingCodes = new Set<string>();
      const result = calculateSuggestions(duplicates, existingCodes, {});
      expect(result.get('a-1')).toBe('142');
      expect(result.get('a-2')).toBe('143');
    })

    it('should increment for subsequent duplicates', () => {
      const duplicates = [
        { id: 'a-1', number: '142' },
        { id: 'a-2', number: '142' },
        { id: 'a-3', number: '142' }
      ];
      const result = calculateSuggestions(duplicates, new Set<string>(), {});
      expect(result.get('a-1')).toBe('142');
      expect(result.get('a-2')).toBe('143');
      expect(result.get('a-3')).toBe('144');
    })

    it('should skip already-set replacement codes', () => {
      const duplicates = [
        { id: 'a-1', number: '142' },
        { id: 'a-2', number: '142' }
      ];
      const replacementCodes = { 'a-1': '999' };
      const result = calculateSuggestions(duplicates, new Set<string>(), replacementCodes);
      expect(result.get('a-1')).toBeNull();
      // a-2 is index 1 in group, so it uses suggestNextCode (not original)
      expect(result.get('a-2')).toBe('143');
    })

    it('should respect excluded codes (CNCJ)', () => {
      const duplicates = [
        { id: 'a-1', number: '142' },
        { id: 'a-2', number: '142' }
      ];
      const excludedCodes = new Set(['142']);
      const result = calculateSuggestions(duplicates, new Set<string>(), {}, excludedCodes);
      expect(result.get('a-1')).toBe('143');
      expect(result.get('a-2')).toBe('144');
    })

    it('should return empty map for empty duplicates', () => {
      const result = calculateSuggestions([], new Set<string>(), {});
      expect(result.size).toBe(0);
    })
  })

  describe('calculateSuggestionsWithDetails', () => {
    it('should return detailed reason for first in group', () => {
      const duplicates = [
        { id: 'a-1', number: '142' },
        { id: 'a-2', number: '142' }
      ];
      const result = calculateSuggestionsWithDetails(duplicates, new Set<string>(), {});
      expect(result.get('a-1')?.code).toBe('142');
      expect(result.get('a-1')?.reason).toContain('premier du groupe');
    })

    it('should return replacement already set reason', () => {
      const duplicates = [{ id: 'a-1', number: '142' }];
      const replacementCodes = { 'a-1': '999' };
      const result = calculateSuggestionsWithDetails(duplicates, new Set<string>(), replacementCodes);
      expect(result.get('a-1')?.code).toBeNull();
      expect(result.get('a-1')?.reason).toContain('déjà saisi');
    })
  })
})
