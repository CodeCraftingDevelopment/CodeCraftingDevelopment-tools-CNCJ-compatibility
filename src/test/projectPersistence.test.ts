import { describe, it, expect } from 'vitest'
import {
  validateProjectFile,
  sanitizeFilename,
  isValidFilename,
  projectFileToAppState
} from '../utils/projectPersistence'

describe('projectPersistence', () => {
  describe('validateProjectFile', () => {
    const validProjectFile = {
      version: '2.2.1',
      metadata: {
        createdAt: '2024-01-01T00:00:00.000Z',
        checksum: 'abc123',
        accountCounts: { client: 10, cncj: 5, general: 100 }
      },
      data: {
        clientAccounts: [],
        cncjAccounts: [],
        generalAccounts: [],
        clientFileInfo: null,
        cncjFileInfo: null,
        generalFileInfo: null,
        replacementCodes: {},
        cncjReplacementCodes: {},
        mergeInfo: [],
        cncjConflictCorrections: {},
        cncjForcedValidations: [],
        finalFilter: 'all',
        accountsNeedingNormalization: [],
        isNormalizationApplied: false,
        missingMetadata: {},
        currentStep: 'step1',
        clientName: '',
        fileName: ''
      }
    };

    it('should accept a valid project file', () => {
      expect(validateProjectFile(validProjectFile)).toBe(true);
    })

    it('should reject null', () => {
      expect(validateProjectFile(null)).toBe(false);
    })

    it('should reject missing version', () => {
      const withoutVersion = { metadata: validProjectFile.metadata, data: validProjectFile.data };
      expect(validateProjectFile(withoutVersion)).toBe(false);
    })

    it('should reject missing metadata', () => {
      const withoutMetadata = { version: validProjectFile.version, data: validProjectFile.data };
      expect(validateProjectFile(withoutMetadata)).toBe(false);
    })

    it('should reject missing data', () => {
      const withoutData = { version: validProjectFile.version, metadata: validProjectFile.metadata };
      expect(validateProjectFile(withoutData)).toBe(false);
    })

    it('should reject invalid currentStep', () => {
      const invalid = {
        ...validProjectFile,
        data: { ...validProjectFile.data, currentStep: 'invalidStep' }
      };
      expect(validateProjectFile(invalid)).toBe(false);
    })

    it('should accept step8 for backward compatibility', () => {
      const withStep8 = {
        ...validProjectFile,
        data: { ...validProjectFile.data, currentStep: 'step8' }
      };
      expect(validateProjectFile(withStep8)).toBe(true);
    })

    it('should reject invalid finalFilter', () => {
      const invalid = {
        ...validProjectFile,
        data: { ...validProjectFile.data, finalFilter: 'invalid' }
      };
      expect(validateProjectFile(invalid)).toBe(false);
    })

    it('should reject non-array clientAccounts', () => {
      const invalid = {
        ...validProjectFile,
        data: { ...validProjectFile.data, clientAccounts: 'not-an-array' }
      };
      expect(validateProjectFile(invalid)).toBe(false);
    })
  })

  describe('sanitizeFilename', () => {
    it('should remove invalid characters', () => {
      expect(sanitizeFilename('file<>:name.ccp')).toBe('filename.ccp');
    })

    it('should add .ccp extension if missing', () => {
      expect(sanitizeFilename('myfile')).toBe('myfile.ccp');
    })

    it('should preserve .ccp extension', () => {
      expect(sanitizeFilename('myfile.ccp')).toBe('myfile.ccp');
    })

    it('should return empty string for whitespace-only input', () => {
      expect(sanitizeFilename('   ')).toBe('');
    })

    it('should trim whitespace', () => {
      expect(sanitizeFilename('  myfile  ')).toBe('myfile.ccp');
    })
  })

  describe('isValidFilename', () => {
    it('should reject too short names', () => {
      expect(isValidFilename('ab')).toBe(false);
    })

    it('should reject too long names (>200 chars)', () => {
      expect(isValidFilename('a'.repeat(201))).toBe(false);
    })

    it('should accept normal names', () => {
      expect(isValidFilename('my-project.ccp')).toBe(true);
    })

    it('should accept exactly 3 chars', () => {
      expect(isValidFilename('abc')).toBe(true);
    })
  })

  describe('projectFileToAppState', () => {
    it('should convert cncjForcedValidations array to Set', () => {
      const projectFile = {
        version: '2.2.1',
        metadata: { createdAt: '', checksum: '', accountCounts: { client: 0, cncj: 0, general: 0 } },
        data: {
          clientAccounts: [],
          cncjAccounts: [],
          generalAccounts: [],
          clientFileInfo: null,
          cncjFileInfo: null,
          generalFileInfo: null,
          replacementCodes: {},
          cncjReplacementCodes: {},
          mergeInfo: [],
          cncjConflictCorrections: {},
          cncjForcedValidations: ['id1', 'id2'],
          finalFilter: 'all' as const,
          accountsNeedingNormalization: [],
          isNormalizationApplied: false,
          missingMetadata: {},
          currentStep: 'step1' as const,
          initialSuggestions: {},
          initialCncjSuggestions: {},
          clientName: '',
          fileName: ''
        }
      };

      const state = projectFileToAppState(projectFile);
      expect(state.cncjForcedValidations).toBeInstanceOf(Set);
      expect(state.cncjForcedValidations.has('id1')).toBe(true);
      expect(state.cncjForcedValidations.has('id2')).toBe(true);
    })

    it('should default missing optional fields', () => {
      const projectFile = {
        version: '2.2.1',
        metadata: { createdAt: '', checksum: '', accountCounts: { client: 0, cncj: 0, general: 0 } },
        data: {
          clientAccounts: [],
          cncjAccounts: [],
          generalAccounts: [],
          clientFileInfo: null,
          cncjFileInfo: null,
          generalFileInfo: null,
          replacementCodes: {},
          cncjReplacementCodes: {},
          mergeInfo: [],
          cncjConflictCorrections: {},
          cncjForcedValidations: [],
          finalFilter: 'all' as const,
          accountsNeedingNormalization: [],
          isNormalizationApplied: false,
          missingMetadata: {},
          currentStep: 'step1' as const,
          initialSuggestions: undefined as unknown as Record<string, never>,
          initialCncjSuggestions: undefined as unknown as Record<string, never>,
          clientName: undefined as unknown as string,
          fileName: undefined as unknown as string
        }
      };

      const state = projectFileToAppState(projectFile);
      expect(state.initialSuggestions).toEqual({});
      expect(state.initialCncjSuggestions).toEqual({});
      expect(state.clientName).toBe('');
      expect(state.fileName).toBe('');
    })

    it('should always set result and cncjConflictResult to null', () => {
      const projectFile = {
        version: '2.2.1',
        metadata: { createdAt: '', checksum: '', accountCounts: { client: 0, cncj: 0, general: 0 } },
        data: {
          clientAccounts: [],
          cncjAccounts: [],
          generalAccounts: [],
          clientFileInfo: null,
          cncjFileInfo: null,
          generalFileInfo: null,
          replacementCodes: {},
          cncjReplacementCodes: {},
          mergeInfo: [],
          cncjConflictCorrections: {},
          cncjForcedValidations: [],
          finalFilter: 'all' as const,
          accountsNeedingNormalization: [],
          isNormalizationApplied: false,
          missingMetadata: {},
          currentStep: 'step4' as const,
          initialSuggestions: {},
          initialCncjSuggestions: {},
          clientName: 'Test',
          fileName: 'test.ccp'
        }
      };

      const state = projectFileToAppState(projectFile);
      expect(state.result).toBeNull();
      expect(state.cncjConflictResult).toBeNull();
    })
  })
})
