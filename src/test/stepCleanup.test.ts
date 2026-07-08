import { describe, it, expect } from 'vitest'
import { cleanupFutureSteps } from '../utils/stepCleanup'
import { AppState } from '../types/accounts'

describe('stepCleanup', () => {
  const makeState = (overrides: Partial<AppState> = {}): AppState => ({
    clientAccounts: [],
    cncjAccounts: [],
    generalAccounts: [],
    clientFileInfo: null,
    cncjFileInfo: null,
    generalFileInfo: null,
    result: null,
    loading: false,
    errors: [],
    currentStep: 'step7',
    replacementCodes: { 'a-1': '142' },
    cncjReplacementCodes: {},
    mergeInfo: [],
    cncjConflictResult: { conflicts: [], nonConflicts: [] },
    cncjConflictCorrections: { 'b-1': '200' },
    cncjForcedValidations: new Set(['x']),
    finalFilter: 'step4',
    accountsNeedingNormalization: [{ id: 'n1', originalNumber: '10001234', normalizedNumber: '1000123' }],
    isNormalizationApplied: true,
    missingMetadata: { 'a-1': { parent_code: '108' } },
    svvCorrespondences: {},
    svvFileInfo: null,
    fecFileInfo: null,
    fecAccountCodes: [],
    initialSuggestions: {},
    initialCncjSuggestions: {},
    clientName: '',
    companyCode: '',
    fileName: '',
    ...overrides
  });

  describe('cleanupFutureSteps', () => {
    it('should reset everything when navigating back to step1', () => {
      const state = makeState();
      const result = cleanupFutureSteps(state, 'step1');

      expect(result.currentStep).toBe('step1');
      expect(result.replacementCodes).toEqual({});
      expect(result.cncjConflictResult).toBeNull();
      expect(result.cncjConflictCorrections).toEqual({});
      expect(result.cncjForcedValidations.size).toBe(0);
      expect(result.finalFilter).toBe('all');
      expect(result.accountsNeedingNormalization).toEqual([]);
      expect(result.isNormalizationApplied).toBe(false);
      expect(result.missingMetadata).toEqual({});
    })

    it('should reset from step4 onward when navigating to step4', () => {
      const state = makeState();
      const result = cleanupFutureSteps(state, 'step4');

      expect(result.currentStep).toBe('step4');
      expect(result.cncjConflictResult).toBeNull();
      expect(result.cncjConflictCorrections).toEqual({});
      expect(result.cncjForcedValidations.size).toBe(0);
      expect(result.finalFilter).toBe('all');
      // replacementCodes should NOT be reset at step4
      expect(result.replacementCodes).toEqual({ 'a-1': '142' });
      // missingMetadata should NOT be reset at step4 (mêmes comptes, on préserve)
      expect(result.missingMetadata).toEqual({ 'a-1': { parent_code: '108' } });
    })

    it('should only reset finalFilter when navigating to step6', () => {
      const state = makeState();
      const result = cleanupFutureSteps(state, 'step6');

      expect(result.currentStep).toBe('step6');
      expect(result.finalFilter).toBe('all');
      // Everything else preserved
      expect(result.replacementCodes).toEqual({ 'a-1': '142' });
      expect(result.cncjConflictResult).not.toBeNull();
      expect(result.cncjForcedValidations.size).toBe(1);
    })

    it('should reset nothing when navigating to stepFinal', () => {
      const state = makeState();
      const result = cleanupFutureSteps(state, 'stepFinal');

      expect(result.currentStep).toBe('stepFinal');
      expect(result.replacementCodes).toEqual({ 'a-1': '142' });
      expect(result.cncjConflictResult).not.toBeNull();
      expect(result.cncjConflictCorrections).toEqual({ 'b-1': '200' });
      expect(result.cncjForcedValidations.size).toBe(1);
      expect(result.finalFilter).toBe('step4');
    })

    it('should reset cncj data when navigating to step5', () => {
      const state = makeState();
      const result = cleanupFutureSteps(state, 'step5');

      expect(result.currentStep).toBe('step5');
      expect(result.cncjForcedValidations.size).toBe(0);
      expect(result.finalFilter).toBe('all');
      // cncjConflictResult and cncjConflictCorrections should be preserved at step5
      expect(result.cncjConflictResult).not.toBeNull();
    })
  })
})
