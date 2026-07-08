import { describe, it, expect } from 'vitest'
import { validateFec, buildFecReportCsv, buildCorrectedFec, buildDecimalCorrectedFec, buildTrimmedFec, convertFecToSemicolon, parseAccountCorrespondences, extractFecAccounts, parseFecAmount, isValidFecDate, suggestFecDate, FEC_COLUMNS, FEC_CONTROLS } from '../utils/fecValidation'
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
    row({ JournalCode: 'VT', EcritureNum: '1', EcritureDate: '20250115', CompteNum: '4110000', Debit: '120.00', Credit: '0', Montantdevise: '120.00', Idevise: 'EUR' }),
    row({ JournalCode: 'VT', EcritureNum: '1', EcritureDate: '20250115', CompteNum: '7010000', Debit: '0', Credit: '100.00', Montantdevise: '100.00', Idevise: 'EUR' }),
    row({ JournalCode: 'VT', EcritureNum: '1', EcritureDate: '20250115', CompteNum: '4457110', Debit: '0', Credit: '20.00', Montantdevise: '20.00', Idevise: 'EUR' })
  ]).replace(/\t/g, ';') // séparateur « ; » attendu par l'import Axelor

  it('rapporte un statut global ok', () => {
    const report = validateFec(fec, 'test.txt')
    expect(report.parseError).toBeUndefined()
    expect(report.delimiterLabel).toBe('point-virgule « ; »')
    expect(report.stats.dataLines).toBe(3)
    expect(report.stats.ecritureCount).toBe(1)
    expect(report.stats.totalDebit).toBeCloseTo(120)
    expect(report.stats.totalCredit).toBeCloseTo(120)
    // Aucun contrôle en erreur (PCG non chargé => skipped, pas error)
    expect(report.checks.find(c => c.id === 'equilibre-global')?.status).toBe('ok')
    expect(report.checks.find(c => c.id === 'equilibre-ecriture')?.status).toBe('ok')
    expect(report.checks.find(c => c.id === 'coherence-pcg')?.status).toBe('skipped')
    expect(report.checks.find(c => c.id === 'format-separateur-decimal')?.status).toBe('ok') // montants en point
    expect(report.globalStatus).toBe('ok')
  })

  it('produit exactement les contrôles fixes FEC_CONTROLS, dans le même ordre', () => {
    // Garde-fou : la liste d'étapes en dur (FEC_CONTROLS) doit rester alignée sur les contrôles réels.
    const report = validateFec(fec, 'test.txt')
    expect(report.checks.map(c => c.id)).toEqual(FEC_CONTROLS.map(c => c.id))
  })
})

describe('fecValidation - séparateur décimal (import Axelor)', () => {
  const fecComma = buildFec([
    row({ JournalCode: 'VT', EcritureNum: '1', EcritureDate: '20250115', CompteNum: '4110000', Debit: '120,00', Credit: '0', Montantdevise: '120,00', Idevise: 'EUR' }),
    row({ JournalCode: 'VT', EcritureNum: '1', EcritureDate: '20250115', CompteNum: '7010000', Debit: '0', Credit: '120,00', Montantdevise: '120,00', Idevise: 'EUR' })
  ])

  it('signale une virgule décimale comme erreur (BigDecimal Axelor exige le point)', () => {
    const report = validateFec(fecComma, 'virgule.txt')
    const check = report.checks.find(c => c.id === 'format-separateur-decimal')!
    expect(check.status).toBe('error')
    expect(check.issues.length).toBe(2)
  })

  it('buildDecimalCorrectedFec convertit la virgule en point et rend le contrôle conforme', () => {
    const corrected = buildDecimalCorrectedFec(fecComma)
    const cells = corrected.split(/\r?\n/)[1].split(TAB)
    expect(cells[11]).toBe('120.00') // Débit
    expect(cells[16]).toBe('120.00') // Montantdevise
    expect(validateFec(corrected, 'x').checks.find(c => c.id === 'format-separateur-decimal')?.status).toBe('ok')
  })

  it('chaîne complète « ; » + devise + décimal + détrim -> tous les contrôles Axelor OK et global conforme', () => {
    // FEC « | », montants virgule, Montantdevise vide, EcritureNum padé (cas réel export DIVALTO)
    const fecPipe = [
      FEC_COLUMNS.join('|'),
      ['RAN', 'A nouveaux', '      19610', '20260101', '1010000', 'Capital', '', '', '', '20260101', 'AN', '68869,73', '0', '', '', '20260101', '', ''].join('|'),
      ['RAN', 'A nouveaux', '      19610', '20260101', '1200000', 'Résultat', '', '', '', '20260101', 'AN', '0', '68869,73', '', '', '20260101', '', ''].join('|')
    ].join('\n')

    const prepared = buildTrimmedFec(buildDecimalCorrectedFec(buildCorrectedFec(convertFecToSemicolon(fecPipe))))
    const report = validateFec(prepared, 'prepare.txt')
    const status = (id: string) => report.checks.find(c => c.id === id)?.status
    expect(status('format-separateur-colonnes')).toBe('ok')
    expect(status('coherence-devise')).toBe('ok')
    expect(status('format-separateur-decimal')).toBe('ok')
    expect(status('format-espaces')).toBe('ok')
    expect(prepared.split('\n')[1].split(';')[2]).toBe('19610') // EcritureNum détrimé
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

describe('fecValidation - Montant devise / Idevise (Axelor)', () => {
  it('accepte Idevise = EUR et Montantdevise = valeur absolue du débit/crédit', () => {
    const fec = buildFec([
      row({ JournalCode: 'VT', EcritureNum: '1', EcritureDate: '20250115', CompteNum: '4110000', Debit: '120,00', Credit: '0', Montantdevise: '120,00', Idevise: 'EUR' }),
      row({ JournalCode: 'VT', EcritureNum: '1', EcritureDate: '20250115', CompteNum: '7010000', Debit: '0', Credit: '120,00', Montantdevise: '120,00', Idevise: 'EUR' })
    ])
    const check = validateFec(fec, 'x').checks.find(c => c.id === 'coherence-devise')!
    expect(check.status).toBe('ok')
  })

  it('signale Idevise vide et Montantdevise vide (cas compta euros non préparée)', () => {
    const fec = buildFec([
      row({ JournalCode: 'RAN', EcritureNum: '1', EcritureDate: '20260101', CompteNum: '1010000', Debit: '68869,73', Credit: '0' })
    ])
    const check = validateFec(fec, 'x').checks.find(c => c.id === 'coherence-devise')!
    expect(check.status).toBe('error')
    expect(check.issues[0].message).toContain('Idevise vide')
    expect(check.issues[0].message).toContain('Montantdevise vide')
    expect(check.issues[0].suggestion).toContain('EUR')
    expect(check.issues[0].suggestion).toContain('68869.73')
  })

  it('signale une mauvaise devise et un montant devise incorrect', () => {
    const fec = buildFec([
      row({ JournalCode: 'VT', EcritureNum: '1', EcritureDate: '20250115', CompteNum: '4110000', Debit: '0', Credit: '120,00', Montantdevise: '99,00', Idevise: 'USD' })
    ])
    const check = validateFec(fec, 'x').checks.find(c => c.id === 'coherence-devise')!
    expect(check.status).toBe('error')
    expect(check.issues[0].message).toContain('« USD » ≠ « EUR »')
    expect(check.issues[0].message).toContain('99.00 ≠ 120.00')
  })

  it('buildCorrectedFec renseigne EUR + Montantdevise et rend le FEC conforme', () => {
    const fec = buildFec([
      row({ JournalCode: 'RAN', EcritureNum: '1', EcritureDate: '20260101', CompteNum: '1010000', Debit: '68869,73', Credit: '0' }),
      row({ JournalCode: 'RAN', EcritureNum: '1', EcritureDate: '20260101', CompteNum: '1200000', Debit: '0', Credit: '68869,73' })
    ])
    const corrected = buildCorrectedFec(fec)
    // Le contrôle devise doit désormais passer
    const check = validateFec(corrected, 'x').checks.find(c => c.id === 'coherence-devise')!
    expect(check.status).toBe('ok')
    // Vérifier les valeurs écrites
    const lines = corrected.split(/\r?\n/)
    const cells1 = lines[1].split('\t')
    expect(cells1[16]).toBe('68869.73') // Montantdevise = |Débit| (point décimal)
    expect(cells1[17]).toBe('EUR')
    const cells2 = lines[2].split('\t')
    expect(cells2[16]).toBe('68869.73') // Montantdevise = |Crédit| (point décimal)
    expect(cells2[17]).toBe('EUR')
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

describe('fecValidation - extraction des comptes', () => {
  it('extrait les comptes distincts du FEC (code + libellé), une fois chacun', () => {
    const fec = buildFec([
      row({ JournalCode: 'VT', EcritureNum: '1', EcritureDate: '20250115', CompteNum: '4110000', CompteLib: 'Clients', Debit: '120', Credit: '0' }),
      row({ JournalCode: 'VT', EcritureNum: '1', EcritureDate: '20250115', CompteNum: '7010000', CompteLib: 'Ventes', Debit: '0', Credit: '120' }),
      row({ JournalCode: 'VT', EcritureNum: '2', EcritureDate: '20250116', CompteNum: '4110000', CompteLib: 'Clients', Debit: '50', Credit: '0' })
    ])
    const accounts = extractFecAccounts(fec)
    expect(accounts).toHaveLength(2) // 4110000 dédoublonné
    expect(accounts.find(a => a.code === '4110000')?.label).toBe('Clients')
    expect(accounts.find(a => a.code === '7010000')?.label).toBe('Ventes')
  })
})

describe('fecValidation - export CSV du rapport', () => {
  it('produit un CSV avec préambule, en-tête de colonnes et une ligne par anomalie', () => {
    const fec = buildFec([
      row({ JournalCode: 'VT', EcritureNum: '1', EcritureDate: '20250115', CompteNum: '4110000', Debit: '120,00', Credit: '0' }),
      row({ JournalCode: 'VT', EcritureNum: '1', EcritureDate: '20250115', CompteNum: '7010000', Debit: '0', Credit: '100,00' }) // déséquilibre
    ])
    const report = validateFec(fec, 'export.txt')
    const csv = buildFecReportCsv(report)

    expect(csv.charCodeAt(0)).toBe(0xfeff) // BOM UTF-8 pour Excel
    expect(csv).toContain('Rapport de vérification FEC : export.txt')
    expect(csv).toContain('Contrôle;Statut;Ligne;Message;Suggestion')
    expect(csv).toContain('Équilibre global Débit = Crédit;Erreur')
  })

  it('exporte toutes les anomalies sans le plafond d\'affichage (maxIssues: Infinity)', () => {
    // 150 écritures déséquilibrées -> l'affichage plafonne à 100, l'export doit tout contenir
    const rows: string[] = []
    for (let i = 1; i <= 150; i++) {
      rows.push(row({ JournalCode: 'VT', EcritureNum: String(i), EcritureDate: '20250115', CompteNum: '4110000', Debit: '10,00', Credit: '0' }))
    }
    const fec = buildFec(rows)

    const displayReport = validateFec(fec, 'big.txt')
    const displayCheck = displayReport.checks.find(c => c.id === 'equilibre-ecriture')!
    expect(displayCheck.issues.length).toBe(100)
    expect(displayCheck.truncated).toBe(true)

    const fullReport = validateFec(fec, 'big.txt', [], { maxIssues: Number.POSITIVE_INFINITY })
    const fullCheck = fullReport.checks.find(c => c.id === 'equilibre-ecriture')!
    expect(fullCheck.issues.length).toBe(150)
    expect(fullCheck.truncated).toBe(false)

    const csv = buildFecReportCsv(fullReport)
    const balanceLines = csv.split('\r\n').filter(l => l.startsWith('Équilibre par écriture'))
    expect(balanceLines.length).toBe(150)
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
    'analyticDistributionTemplate.importId', 'statusSelect', 'isCncj'
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
  it('élargit à la famille à 3 chiffres quand la racine à 4 chiffres est absente', () => {
    const fec = buildFec([
      row({ JournalCode: 'AC', EcritureNum: '1', EcritureDate: '20250115', CompteNum: '6261000', Debit: '10', Credit: '0' }),
      row({ JournalCode: 'AC', EcritureNum: '1', EcritureDate: '20250115', CompteNum: '6260000', Debit: '0', Credit: '10' })
    ])
    // Famille 6261 sans racine 6261000 ; on doit remonter au générique à 3 chiffres 6260000.
    const report = validateFec(fec, 'fec.txt', [{ number: '6261100' }, { number: '6261200' }, { number: '6260000' }])
    const pcg = report.checks.find(c => c.id === 'coherence-pcg')!
    const issue = pcg.issues.find(i => i.message.includes('6261000'))!
    expect(issue.suggestion).toContain('6260000')
    expect(issue.suggestion).not.toContain('6261100')
  })

  it('propose le générique de la famille à 3 chiffres quand la famille à 4 chiffres est vide', () => {
    const fec = buildFec([
      row({ JournalCode: 'VT', EcritureNum: '1', EcritureDate: '20250115', CompteNum: '70670000', Debit: '10', Credit: '0' }),
      row({ JournalCode: 'VT', EcritureNum: '1', EcritureDate: '20250115', CompteNum: '5300000', Debit: '0', Credit: '10' })
    ])
    // Aucun 7067xxx ; le générique de la famille 706 (7060000) doit être proposé.
    const report = validateFec(fec, 'fec.txt', [{ number: '7060000', name: 'Prestations de services' }, { number: '7061100' }])
    const issue = report.checks.find(c => c.id === 'coherence-pcg')!.issues.find(i => i.message.includes('70670000'))!
    expect(issue.suggestion).toContain('7060000')
    expect(issue.suggestion).toContain('Prestations de services')
  })

  it('parse la table de correspondances (original -> final)', () => {
    const csv = '"account_title";"original_client_code";"final_code"\n' +
      '"TVA Déductible";"44566310";"4456640"\n' +
      '"Vente";"47031000";"4682030"'
    const map = parseAccountCorrespondences(csv)
    expect(map.size).toBe(2)
    expect(map.get('44566310')).toBe('4456640')
    expect(map.get('47031000')).toBe('4682030')
  })

  it('reconnaît un compte mappé même si son code final est absent du PCG chargé', () => {
    const fec = buildFec([
      row({ JournalCode: 'AC', EcritureNum: '1', EcritureDate: '20250115', CompteNum: '62282000', CompteLib: 'FRAIS SUR VENTES', Debit: '20', Credit: '0' }),
      row({ JournalCode: 'AC', EcritureNum: '1', EcritureDate: '20250115', CompteNum: '4110000', Debit: '0', Credit: '20' })
    ])
    // Le code final 6228200 (compte créé par l'intégration) n'est PAS dans le PCG chargé (modèle),
    // mais 62282000 est dans la table de correspondances -> il doit être reconnu, pas signalé absent.
    const correspondences = new Map([['62282000', '6228200']])
    const report = validateFec(fec, 'fec.txt', [{ number: '4110000', name: 'Clients' }, { number: '6228000', name: 'Divers' }], { correspondences })
    const pcg = report.checks.find(c => c.id === 'coherence-pcg')!
    expect(pcg.issues.some(i => i.message.includes('62282000'))).toBe(false)
    expect(pcg.summary).toContain('via correspondance')
  })

  it('affiche le libellé du compte FEC manquant et celui du compte PCG suggéré', () => {
    const fec = buildFec([
      row({ JournalCode: 'BQ', EcritureNum: '1', EcritureDate: '20260101', CompteNum: '51213000', CompteLib: 'Comptes en francs', Debit: '10', Credit: '0' }),
      row({ JournalCode: 'BQ', EcritureNum: '1', EcritureDate: '20260101', CompteNum: '5121000', CompteLib: 'Comptes en euros', Debit: '0', Credit: '10' })
    ])
    const report = validateFec(fec, 'fec.txt', [{ number: '5121000', name: 'Comptes en euros' }])
    const issue = report.checks.find(c => c.id === 'coherence-pcg')!.issues.find(i => i.message.includes('51213000'))!
    expect(issue.message).toContain('(Comptes en francs)')
    expect(issue.suggestion).toContain('5121000')
    expect(issue.suggestion).toContain('(Comptes en euros)')
  })

  it('privilégie le compte générique (parent) plutôt que le voisin numérique spécifique', () => {
    // Cas réel LANDES : 51213000 « Comptes en francs » absent.
    // Candidats préfixe 5121 : 5121000 (générique), 5121140 et 5121150 (banques spécifiques).
    // Numériquement le plus proche serait 5121150, mais on doit proposer le générique 5121000.
    const fec = buildFec([
      row({ JournalCode: 'BQ', EcritureNum: '1', EcritureDate: '20260101', CompteNum: '51213000', Debit: '10', Credit: '0' }),
      row({ JournalCode: 'BQ', EcritureNum: '1', EcritureDate: '20260101', CompteNum: '5121000', Debit: '0', Credit: '10' })
    ])
    const report = validateFec(fec, 'fec.txt', [
      { number: '5121000' },
      { number: '5121140' },
      { number: '5121150' }
    ])
    const pcg = report.checks.find(c => c.id === 'coherence-pcg')!
    const issue = pcg.issues.find(i => i.message.includes('51213000'))!
    expect(issue.suggestion).toContain('5121000')
    expect(issue.suggestion).not.toContain('5121150')
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

  it('n\'émet aucun contrôle de lettrage (EcritureLet/DateLet optionnels selon la norme)', () => {
    const fec = buildFec([
      row({ JournalCode: 'BQ', EcritureNum: '1', EcritureDate: '20250115', CompteNum: '4110000', Debit: '10', Credit: '0', EcritureLet: 'AAA' }),
      row({ JournalCode: 'BQ', EcritureNum: '1', EcritureDate: '20250115', CompteNum: '5120000', Debit: '0', Credit: '10', EcritureLet: '*1' })
    ])
    const report = validateFec(fec, 'fec.txt')
    // Le contrôle « cohérence du lettrage » a été retiré (non normatif)
    expect(report.checks.find(c => c.id === 'coherence-lettrage')).toBeUndefined()
  })
})
