import { describe, it, expect } from 'vitest'
import { validateFec, parseFecAmount, isValidFecDate, suggestFecDate, FEC_COLUMNS } from '../utils/fecValidation'
import { parseCSVFile } from '../utils/accountUtils'

const TAB = '\t'
const header = FEC_COLUMNS.join(TAB)

// Construit une ligne FEC à partir d'un objet partiel (colonnes manquantes = vides)
const row = (values: Partial<Record<(typeof FEC_COLUMNS)[number], string>>): string =>
  FEC_COLUMNS.map(c => values[c] ?? '').join(TAB)

const buildFec = (rows: string[]): string => [header, ...rows].join('\n')

describe('fecValidation - helpers', () => {
  it('parse les montants avec virgule ou point, vide = 0', () => {
    expect(parseFecAmount('1234,56')).toBeCloseTo(1234.56)
    expect(parseFecAmount('1234.56')).toBeCloseTo(1234.56)
    expect(parseFecAmount('')).toBe(0)
    expect(parseFecAmount('abc')).toBeNaN()
  })

  it('valide les dates AAAAMMJJ', () => {
    expect(isValidFecDate('20250131')).toBe(true)
    expect(isValidFecDate('20250230')).toBe(false) // 30 février
    expect(isValidFecDate('2025-01-31')).toBe(false)
    expect(isValidFecDate('')).toBe(false)
  })

  it('propose un reformatage de date reconnaissable', () => {
    expect(suggestFecDate('2025-01-31')).toBe('20250131')
    expect(suggestFecDate('31/01/2025')).toBe('20250131')
    expect(suggestFecDate('31.01.2025')).toBe('20250131')
    expect(suggestFecDate('31/13/2025')).toBeNull() // mois invalide
    expect(suggestFecDate('nimportequoi')).toBeNull()
  })
})

describe('fecValidation - FEC conforme', () => {
  const fec = buildFec([
    row({ JournalCode: 'VT', EcritureNum: '1', EcritureDate: '20250115', CompteNum: '4110000', Debit: '120,00', Credit: '0' }),
    row({ JournalCode: 'VT', EcritureNum: '1', EcritureDate: '20250115', CompteNum: '7010000', Debit: '0', Credit: '100,00' }),
    row({ JournalCode: 'VT', EcritureNum: '1', EcritureDate: '20250115', CompteNum: '4457110', Debit: '0', Credit: '20,00' })
  ])

  it('rapporte un statut global ok', () => {
    const report = validateFec(fec, 'test.txt')
    expect(report.parseError).toBeUndefined()
    expect(report.delimiterLabel).toBe('tabulation')
    expect(report.stats.dataLines).toBe(3)
    expect(report.stats.ecritureCount).toBe(1)
    expect(report.stats.totalDebit).toBeCloseTo(120)
    expect(report.stats.totalCredit).toBeCloseTo(120)
    // Aucun contrôle en erreur (PCG non chargé => skipped, pas error)
    expect(report.checks.find(c => c.id === 'equilibre-global')?.status).toBe('ok')
    expect(report.checks.find(c => c.id === 'equilibre-ecriture')?.status).toBe('ok')
    expect(report.checks.find(c => c.id === 'coherence-pcg')?.status).toBe('skipped')
    expect(report.globalStatus).toBe('ok')
  })
})

describe('fecValidation - anomalies détectées', () => {
  const fec = buildFec([
    // Écriture 1 déséquilibrée (120 debit vs 100 credit) + date invalide
    row({ JournalCode: 'VT', EcritureNum: '1', EcritureDate: '20250230', CompteNum: '4110000', Debit: '120,00', Credit: '0' }),
    row({ JournalCode: 'VT', EcritureNum: '1', EcritureDate: '20250115', CompteNum: '7010000', Debit: '0', Credit: '100,00' }),
    // Montant non numérique + CompteNum vide
    row({ JournalCode: 'AC', EcritureNum: '2', EcritureDate: '20250116', CompteNum: '', Debit: 'x', Credit: '50,00' })
  ])

  it('remonte déséquilibres, dates et montants invalides', () => {
    const report = validateFec(fec, 'ko.txt')
    const byId = (id: string) => report.checks.find(c => c.id === id)!

    expect(byId('equilibre-global').status).toBe('error')          // total débit ≠ crédit
    expect(byId('equilibre-ecriture').status).toBe('error')        // écriture VT/1 déséquilibrée
    expect(byId('format-date-ecriture').status).toBe('error')      // 20250230 invalide
    expect(byId('format-montants').status).toBe('error')           // 'x' non numérique
    expect(byId('champs-obligatoires').status).toBe('error')       // CompteNum vide
    expect(byId('coherence-date-ecriture').status).toBe('warning') // 2 dates dans l'écriture VT/1
    expect(report.globalStatus).toBe('error')
  })
})

describe('fecValidation - guillemets englobants', () => {
  it('signale une ligne entière encadrée de guillemets sans nettoyer le contenu', () => {
    // Reproduit le format du fichier client : chaque ligne est entourée d'un « " »
    const wrap = (line: string) => `"${line}"`
    const fec = [
      wrap(header),
      wrap(row({ JournalCode: 'RAN', EcritureNum: '1', EcritureDate: '20260101', CompteNum: '1010000', Debit: '100,00', Credit: '0' })),
      wrap(row({ JournalCode: 'RAN', EcritureNum: '1', EcritureDate: '20260101', CompteNum: '7010000', Debit: '0', Credit: '100,00' }))
    ].join('\n')

    const report = validateFec(fec, 'guillemets.txt')
    const quoteCheck = report.checks.find(c => c.id === 'structure-guillemets')!
    expect(quoteCheck.status).toBe('warning')
    expect(quoteCheck.issues.some(i => i.message.includes('encadré'))).toBe(true)
    expect(quoteCheck.issues.some(i => i.message.includes('2 ligne'))).toBe(true)
    // La lecture n'est pas modifiée : la 1ʳᵉ et la dernière colonne restent faussées
    expect(report.checks.find(c => c.id === 'structure-colonnes')?.status).toBe('warning')
  })
})

describe('fecValidation - structure', () => {
  it('détecte un mauvais nombre de colonnes', () => {
    const badHeader = FEC_COLUMNS.slice(0, 17).join(TAB)
    const report = validateFec(badHeader + '\n' + 'a'.repeat(1), 'bad.txt')
    expect(report.checks.find(c => c.id === 'structure-colonnes')?.status).toBe('error')
  })

  it('cohérence PCG : compte absent => warning', () => {
    const fec = buildFec([
      row({ JournalCode: 'VT', EcritureNum: '1', EcritureDate: '20250115', CompteNum: '9999999', Debit: '10', Credit: '0' }),
      row({ JournalCode: 'VT', EcritureNum: '1', EcritureDate: '20250115', CompteNum: '7010000', Debit: '0', Credit: '10' })
    ])
    const report = validateFec(fec, 'pcg.txt', [{ number: '7010000' }])
    const pcg = report.checks.find(c => c.id === 'coherence-pcg')!
    expect(pcg.status).toBe('warning')
    expect(pcg.issues.some(i => i.message.includes('9999999'))).toBe(true)
  })
})

describe('fecValidation - intégration upload PCG complet (format Axelor)', () => {
  // Reproduit l'en-tête réel de comptes-pcg-complet.csv (PCG + CNCJ + clients)
  const pcgHeader = [
    'importId', 'code', 'parent_code', 'name', 'accountType.importId', 'isRegulatoryAccount',
    'commonPosition', 'reconcileOk', 'compatibleAccounts', 'useForPartnerBalance',
    'isTaxAuthorizedOnMoveLine', 'isTaxRequiredOnMoveLine', 'defaultTaxSet', 'vatSystemSelect',
    'isRetrievedOnPaymentSession', 'serviceType.code', 'manageCutOffPeriod',
    'hasAutomaticApplicationAccountingDate', 'analyticDistributionAuthorized',
    'analyticDistributionRequiredOnInvoiceLines', 'analyticDistributionRequiredOnMoveLines',
    'analyticDistributionTemplate.importId', 'statusSelect', 'isCNCJ'
  ].join(';')
  const pcgRow = (importId: string, code: string, name: string): string =>
    [importId, code, '', name, 'AT001', 'true', '0', ...Array(16).fill(''), '1', 'false'].join(';')

  it('extrait les codes du fichier PCG et alimente le contrôle de cohérence', async () => {
    const pcgCsv = [
      pcgHeader,
      pcgRow('A1', '6260000', 'Frais postaux'),
      pcgRow('A2', '7010000', 'Ventes')
    ].join('\n')
    const pcgFile = new File([pcgCsv], 'comptes-pcg-complet.csv', { type: 'text/csv' })
    const parsed = await parseCSVFile(pcgFile, true)
    const pcgAccounts = parsed.accounts.map(a => ({ number: a.number }))

    // Le parsing doit récupérer les 2 codes de la colonne « code »
    expect(pcgAccounts.map(a => a.number).sort()).toEqual(['6260000', '7010000'])

    const fec = buildFec([
      row({ JournalCode: 'VT', EcritureNum: '1', EcritureDate: '20250115', CompteNum: '6260000', Debit: '10', Credit: '0' }),
      row({ JournalCode: 'VT', EcritureNum: '1', EcritureDate: '20250115', CompteNum: '9999999', Debit: '0', Credit: '10' })
    ])
    const report = validateFec(fec, 'fec.txt', pcgAccounts)
    const pcg = report.checks.find(c => c.id === 'coherence-pcg')!
    expect(pcg.status).toBe('warning')
    expect(pcg.issues.some(i => i.message.includes('9999999'))).toBe(true)
    expect(pcg.issues.some(i => i.message.includes('6260000'))).toBe(false)
  })
})

describe('fecValidation - suggestions de correction', () => {
  it('propose le compte PCG le plus proche pour un compte absent', () => {
    const fec = buildFec([
      row({ JournalCode: 'AC', EcritureNum: '1', EcritureDate: '20250115', CompteNum: '6261500', Debit: '10', Credit: '0' }),
      row({ JournalCode: 'AC', EcritureNum: '1', EcritureDate: '20250115', CompteNum: '6260000', Debit: '0', Credit: '10' })
    ])
    // PCG contient 6261100 et 6260000 ; 6261500 (préfixe 6261) doit suggérer 6261100
    const report = validateFec(fec, 'fec.txt', [{ number: '6261100' }, { number: '6260000' }])
    const pcg = report.checks.find(c => c.id === 'coherence-pcg')!
    const issue = pcg.issues.find(i => i.message.includes('6261500'))!
    expect(issue.suggestion).toContain('6261100')
  })

  it('propose un reformatage pour une date d\'écriture reconnaissable', () => {
    const fec = buildFec([
      row({ JournalCode: 'VT', EcritureNum: '1', EcritureDate: '31/01/2025', CompteNum: '4110000', Debit: '10', Credit: '0' }),
      row({ JournalCode: 'VT', EcritureNum: '1', EcritureDate: '20250131', CompteNum: '7010000', Debit: '0', Credit: '10' })
    ])
    const report = validateFec(fec, 'fec.txt')
    const dateCheck = report.checks.find(c => c.id === 'format-date-ecriture')!
    const issue = dateCheck.issues.find(i => i.message.includes('31/01/2025'))!
    expect(issue.suggestion).toContain('20250131')
  })

  it('propose la date d\'écriture pour un lettrage sans DateLet', () => {
    const fec = buildFec([
      row({ JournalCode: 'BQ', EcritureNum: '1', EcritureDate: '20250115', CompteNum: '4110000', Debit: '10', Credit: '0', EcritureLet: 'AAA' }),
      row({ JournalCode: 'BQ', EcritureNum: '1', EcritureDate: '20250115', CompteNum: '5120000', Debit: '0', Credit: '10' })
    ])
    const report = validateFec(fec, 'fec.txt')
    const letterCheck = report.checks.find(c => c.id === 'coherence-lettrage')!
    expect(letterCheck.status).toBe('warning')
    expect(letterCheck.issues[0].suggestion).toContain('20250115')
  })
})
