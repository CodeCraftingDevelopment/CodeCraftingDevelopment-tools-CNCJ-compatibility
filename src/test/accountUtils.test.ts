import { describe, it, expect } from 'vitest'
import { parseCSVFile, mergeIdenticalAccounts, findDuplicates, findAccountsNeedingNormalization, parseSvvCorrespondences } from '../utils/accountUtils'
import { Account } from '../types/accounts'

describe('accountUtils', () => {
  describe('parseCSVFile', () => {
    it('should parse a valid CSV file with semicolon delimiter', async () => {
      const csvContent = 'Numéro;Intitulé\n101;Compte test\n102;Autre compte'
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' })
      
      const result = await parseCSVFile(file)
      
      expect(result.errors).toHaveLength(0)
      expect(result.accounts).toHaveLength(2)
      expect(result.accounts[0]).toEqual({
        id: '101-1',
        number: '101',
        title: 'Compte test',
        source: 'client',
        originalNumber: '101'
      })
      expect(result.accounts[1]).toEqual({
        id: '102-2', 
        number: '102',
        title: 'Autre compte',
        source: 'client',
        originalNumber: '102'
      })
    })

    it('should handle empty rows correctly', async () => {
      const csvContent = 'Numéro;Intitulé\n101;Compte test\n\n102;Autre compte\n;'
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' })
      
      const result = await parseCSVFile(file)
      
      expect(result.errors).toHaveLength(0)
      expect(result.accounts).toHaveLength(2)
    })

    it('should skip header rows automatically', async () => {
      const csvContent = 'Numéro;Intitulé\n101;Compte test\n102;Autre compte'
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' })
      
      const result = await parseCSVFile(file)
      
      expect(result.errors).toHaveLength(0)
      expect(result.accounts).toHaveLength(2)
      expect(result.accounts[0].number).toBe('101')
    })

    it('should reject files with more than 100,000 rows', async () => {
      // Create a CSV with 100,001 rows
      const rows = ['Numéro;Intitulé']
      for (let i = 1; i <= 100001; i++) {
        rows.push(`${i};Compte ${i}`)
      }
      const csvContent = rows.join('\n')
      const file = new File([csvContent], 'large.csv', { type: 'text/csv' })
      
      const result = await parseCSVFile(file)
      
      expect(result.errors).toContain('Le fichier contient plus de 100 000 lignes. Pour des raisons de performance, veuillez diviser ce fichier en plusieurs parties plus petites.')
    })

    it('should handle alphanumeric account numbers when allowed', async () => {
      const csvContent = 'Numéro;Intitulé\nABC123;Compte test\n456DEF;Autre compte'
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' })
      
      const result = await parseCSVFile(file, true)
      
      expect(result.errors).toHaveLength(0)
      expect(result.accounts).toHaveLength(2)
      expect(result.accounts[0].number).toBe('ABC123')
      expect(result.accounts[1].number).toBe('456DEF')
    })

    it('should reject alphanumeric account numbers when not allowed', async () => {
      const csvContent = 'Numéro;Intitulé\nABC123;Compte test'
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' })
      
      const result = await parseCSVFile(file, false)
      
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.accounts).toHaveLength(0)
    })
  })

  describe('mergeIdenticalAccounts', () => {
    it('should merge accounts with same number and title', () => {
      const accounts: Account[] = [
        { id: '101-1', number: '101', title: 'Compte A', source: 'client', originalNumber: '101' },
        { id: '101-2', number: '101', title: 'Compte A', source: 'client', originalNumber: '101' },
        { id: '102-1', number: '102', title: 'Compte B', source: 'client', originalNumber: '102' },
        { id: '101-3', number: '101', title: 'Compte A', source: 'client', originalNumber: '101' }
      ]
      
      const result = mergeIdenticalAccounts(accounts)
      
      expect(result.merged).toHaveLength(2)
      expect(result.mergeInfo).toHaveLength(1)
      expect(result.mergeInfo[0]).toEqual({
        number: '101',
        title: 'Compte A',
        mergedCount: 3
      })
    })

    it('should not merge accounts with different titles', () => {
      const accounts: Account[] = [
        { id: '101-1', number: '101', title: 'Compte A', source: 'client', originalNumber: '101' },
        { id: '101-2', number: '101', title: 'Compte B', source: 'client', originalNumber: '101' }
      ]
      
      const result = mergeIdenticalAccounts(accounts)
      
      expect(result.merged).toHaveLength(2)
      expect(result.mergeInfo).toHaveLength(0)
    })

    it('should handle empty titles correctly', () => {
      const accounts: Account[] = [
        { id: '101-1', number: '101', title: '', source: 'client', originalNumber: '101' },
        { id: '101-2', number: '101', title: '', source: 'client', originalNumber: '101' },
        { id: '101-3', number: '101', title: 'Compte A', source: 'client', originalNumber: '101' }
      ]
      
      const result = mergeIdenticalAccounts(accounts)
      
      expect(result.merged).toHaveLength(2)
      expect(result.mergeInfo).toHaveLength(1)
      expect(result.mergeInfo[0]).toEqual({
        number: '101',
        title: '',
        mergedCount: 2
      })
    })

    it('should return empty result for empty input', () => {
      const result = mergeIdenticalAccounts([])
      
      expect(result.merged).toHaveLength(0)
      expect(result.mergeInfo).toHaveLength(0)
    })
  })

  describe('findDuplicates', () => {
    it('should find accounts with duplicate numbers', () => {
      const accounts: Account[] = [
        { id: '101-1', number: '101', title: 'Compte A', source: 'client', originalNumber: '101' },
        { id: '102-1', number: '102', title: 'Compte B', source: 'client', originalNumber: '102' },
        { id: '101-2', number: '101', title: 'Compte C', source: 'client', originalNumber: '101' },
        { id: '103-1', number: '103', title: 'Compte D', source: 'client', originalNumber: '103' },
        { id: '101-3', number: '101', title: 'Compte E', source: 'client', originalNumber: '101' }
      ]
      
      const duplicates = findDuplicates(accounts)
      
      expect(duplicates).toHaveLength(3)
      expect(duplicates.every(d => d.number === '101')).toBe(true)
    })

    it('should return empty array when no duplicates exist', () => {
      const accounts: Account[] = [
        { id: '101-1', number: '101', title: 'Compte A', source: 'client', originalNumber: '101' },
        { id: '102-1', number: '102', title: 'Compte B', source: 'client', originalNumber: '102' },
        { id: '103-1', number: '103', title: 'Compte C', source: 'client', originalNumber: '103' }
      ]
      
      const duplicates = findDuplicates(accounts)
      
      expect(duplicates).toHaveLength(0)
    })

    it('should handle empty input', () => {
      const duplicates = findDuplicates([])

      expect(duplicates).toHaveLength(0)
    })
  })

  describe('findAccountsNeedingNormalization (mappage SVV)', () => {
    it('impose la correspondance SVV au lieu de la troncature et marque isSvv', () => {
      const accounts: Account[] = [
        { id: '44566300-1', number: '44566300', title: 'A', source: 'client', originalNumber: '44566300' }
      ]
      const result = findAccountsNeedingNormalization(accounts, { '44566300': '4456620' })
      expect(result).toHaveLength(1)
      expect(result[0].normalizedNumber).toBe('4456620') // et non la troncature '4456630'
      expect(result[0].isSvv).toBe(true)
    })

    it('retombe sur la troncature pour les comptes absents du mappage SVV', () => {
      const accounts: Account[] = [
        { id: '12345678-1', number: '12345678', title: 'B', source: 'client', originalNumber: '12345678' }
      ]
      const result = findAccountsNeedingNormalization(accounts, {})
      expect(result[0].normalizedNumber).toBe('1234567')
      expect(result[0].isSvv).toBe(false)
    })

    it('mappe des codes sources distincts vers la même cible (doublons gérés en aval)', () => {
      const accounts: Account[] = [
        { id: '44571000-1', number: '44571000', title: 'X', source: 'client', originalNumber: '44571000' },
        { id: '44571100-2', number: '44571100', title: 'Y', source: 'client', originalNumber: '44571100' }
      ]
      const result = findAccountsNeedingNormalization(accounts, { '44571000': '4457110', '44571100': '4457110' })
      expect(result.map(r => r.normalizedNumber)).toEqual(['4457110', '4457110'])
      expect(result.every(r => r.isSvv)).toBe(true)
    })
  })

  describe('parseSvvCorrespondences', () => {
    it('parse un CSV point-virgule avec en-tête et l\'ignore', async () => {
      const csv = 'Compte Enchères;Correspondance\n44566300;4456620\n44571000;4457110'
      const file = new File([csv], 'svv.csv', { type: 'text/csv' })
      const { correspondences, count, errors } = await parseSvvCorrespondences(file)
      expect(count).toBe(2)
      expect(errors).toHaveLength(0)
      expect(correspondences['44566300']).toBe('4456620')
      expect(correspondences['44571000']).toBe('4457110')
    })
  })
})
