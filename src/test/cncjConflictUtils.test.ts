import { describe, it, expect } from 'vitest'
import {
  incrementCodeWithConstraint,
  autoCorrectCncjConflicts,
  processCncjConflicts
} from '../utils/cncjConflictUtils'
import { Account } from '../types/accounts'

describe('cncjConflictUtils', () => {
  describe('incrementCodeWithConstraint', () => {
    it('should increment a normal code', () => {
      expect(incrementCodeWithConstraint('1000100')).toBe('1000101');
    })

    it('should return null when increment would cross decade (ends in 9)', () => {
      expect(incrementCodeWithConstraint('1000109')).toBeNull();
    })

    it('should return null for non-numeric input', () => {
      expect(incrementCodeWithConstraint('ABC')).toBeNull();
    })

    it('should pad short codes to 7 digits', () => {
      expect(incrementCodeWithConstraint('100')).toBe('1000001');
    })

    it('should truncate codes longer than 7 digits', () => {
      expect(incrementCodeWithConstraint('10001001')).toBe('1000101');
    })

    it('should handle code 0000000', () => {
      expect(incrementCodeWithConstraint('0000000')).toBe('0000001');
    })
  })

  describe('autoCorrectCncjConflicts', () => {
    const makeAccount = (id: string, number: string): Account => ({
      id, number, source: 'client'
    });

    it('should correct a single conflict by incrementing', () => {
      const conflicts = [makeAccount('c1', '1000101')];
      const cncjAccounts = [makeAccount('cncj1', '1000101')];
      const mergedClients = [makeAccount('c1', '1000101')];

      const result = autoCorrectCncjConflicts(conflicts, cncjAccounts, mergedClients);
      expect(result['c1']).toBe('1000102');
    })

    it('should handle multiple conflicts on same decade', () => {
      const conflicts = [
        makeAccount('c1', '1000101'),
        makeAccount('c2', '1000102')
      ];
      const cncjAccounts = [
        makeAccount('cncj1', '1000101'),
        makeAccount('cncj2', '1000102')
      ];
      const mergedClients = [
        makeAccount('c1', '1000101'),
        makeAccount('c2', '1000102')
      ];

      const result = autoCorrectCncjConflicts(conflicts, cncjAccounts, mergedClients);
      expect(result['c1']).toBe('1000103');
      expect(result['c2']).toBe('1000104');
    })

    it('should return error when decade is saturated', () => {
      const conflicts = [makeAccount('c1', '1000109')];
      const cncjAccounts = [makeAccount('cncj1', '1000109')];
      const mergedClients = [makeAccount('c1', '1000109')];

      const result = autoCorrectCncjConflicts(conflicts, cncjAccounts, mergedClients);
      expect(result['c1']).toBe('error');
    })

    it('should skip codes already used by clients', () => {
      const conflicts = [makeAccount('c1', '1000101')];
      const cncjAccounts = [makeAccount('cncj1', '1000101')];
      const mergedClients = [
        makeAccount('c1', '1000101'),
        makeAccount('c2', '1000102')
      ];

      const result = autoCorrectCncjConflicts(conflicts, cncjAccounts, mergedClients);
      expect(result['c1']).toBe('1000103');
    })

    it('should produce deterministic results (sorted by number)', () => {
      const conflicts = [
        makeAccount('c2', '1000102'),
        makeAccount('c1', '1000101')
      ];
      const cncjAccounts = [
        makeAccount('cncj1', '1000101'),
        makeAccount('cncj2', '1000102')
      ];
      const mergedClients = conflicts;

      const result = autoCorrectCncjConflicts(conflicts, cncjAccounts, mergedClients);
      // c1 (1000101) processed first due to sort, gets 1000103
      expect(result['c1']).toBe('1000103');
      // c2 (1000102) processed second, gets 1000104
      expect(result['c2']).toBe('1000104');
    })

    it('should handle empty conflicts', () => {
      const result = autoCorrectCncjConflicts([], [], []);
      expect(Object.keys(result)).toHaveLength(0);
    })
  })

  describe('processCncjConflicts', () => {
    const makeAccount = (id: string, number: string): Account => ({
      id, number, source: 'client'
    });

    it('should separate conflicts from non-conflicts', () => {
      const clients = [
        makeAccount('c1', '1000101'),
        makeAccount('c2', '2000201'),
        makeAccount('c3', '3000301')
      ];
      const cncjAccounts = [makeAccount('cncj1', '1000101')];

      const result = processCncjConflicts(clients, cncjAccounts);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].id).toBe('c1');
      expect(result.nonConflicts).toHaveLength(2);
    })

    it('should return empty results for empty inputs', () => {
      const result = processCncjConflicts([], []);
      expect(result.conflicts).toHaveLength(0);
      expect(result.nonConflicts).toHaveLength(0);
    })

    it('should return all as non-conflicts when no CNCJ match', () => {
      const clients = [makeAccount('c1', '9999999')];
      const cncjAccounts = [makeAccount('cncj1', '1111111')];

      const result = processCncjConflicts(clients, cncjAccounts);
      expect(result.conflicts).toHaveLength(0);
      expect(result.nonConflicts).toHaveLength(1);
    })
  })
})
