import { describe, it, expect } from 'vitest'
import {
  detectCSVFormat,
  extractAccountData,
  isValidAccountNumber
} from '../utils/csvFormatDetector'

describe('csvFormatDetector', () => {
  describe('detectCSVFormat', () => {
    it('should detect array format', () => {
      expect(detectCSVFormat(['101', 'Compte A'])).toBe('array');
    })

    it('should detect object format with account key', () => {
      expect(detectCSVFormat({ account: '101', title: 'Test' })).toBe('object');
    })

    it('should detect object format with 2+ keys', () => {
      expect(detectCSVFormat({ col1: '101', col2: 'Test' })).toBe('object');
    })

    it('should detect axelor format from headers', () => {
      const row = ['1', '101', 'type', 'Compte'];
      const headers = ['accountType.importId', 'code', 'type', 'name'];
      expect(detectCSVFormat(row, headers)).toBe('axelor');
    })

    it('should return unknown for null input', () => {
      expect(detectCSVFormat(null)).toBe('unknown');
    })

    it('should return unknown for undefined input', () => {
      expect(detectCSVFormat(undefined)).toBe('unknown');
    })
  })

  describe('extractAccountData', () => {
    it('should extract from array format', () => {
      const result = extractAccountData(['101', 'Compte A'], 'array');
      expect(result.accountNumber).toBe('101');
      expect(result.accountTitle).toBe('Compte A');
    })

    it('should extract from object format with account key', () => {
      const result = extractAccountData({ account: '101', title: 'Test' }, 'object');
      expect(result.accountNumber).toBe('101');
      expect(result.accountTitle).toBe('Test');
    })

    it('should extract from axelor array format', () => {
      const result = extractAccountData(['1', '101', 'type', 'Compte A'], 'axelor');
      expect(result.accountNumber).toBe('101');
      expect(result.accountTitle).toBe('Compte A');
    })

    it('should return empty strings for unknown format', () => {
      const result = extractAccountData({}, 'unknown');
      expect(result.accountNumber).toBe('');
      expect(result.accountTitle).toBe('');
    })

    it('should return empty strings for null input', () => {
      const result = extractAccountData(null, 'array');
      expect(result.accountNumber).toBe('');
      expect(result.accountTitle).toBe('');
    })
  })

  describe('isValidAccountNumber', () => {
    it('should accept numeric account numbers', () => {
      expect(isValidAccountNumber('1234567')).toBe(true);
    })

    it('should reject alphanumeric when not allowed', () => {
      expect(isValidAccountNumber('ABC123', false)).toBe(false);
    })

    it('should accept alphanumeric when allowed', () => {
      expect(isValidAccountNumber('ABC123', true)).toBe(true);
    })

    it('should accept underscores and hyphens when alphanumeric allowed', () => {
      expect(isValidAccountNumber('ABC-123_X', true)).toBe(true);
    })

    it('should reject empty string', () => {
      expect(isValidAccountNumber('')).toBe(false);
    })

    it('should reject special characters in numeric mode', () => {
      expect(isValidAccountNumber('123.456')).toBe(false);
    })
  })
})
