import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx-js-style'
import { validateFec, FEC_COLUMNS } from '../utils/fecValidation'
import { buildFecReportWorkbook } from '../utils/fecReportExcel'

const TAB = '\t'
const header = FEC_COLUMNS.join(TAB)
const row = (values: Partial<Record<(typeof FEC_COLUMNS)[number], string>>): string =>
  FEC_COLUMNS.map(c => values[c] ?? '').join(TAB)
const buildFec = (rows: string[]): string => [header, ...rows].join('\n')

describe('fecReportExcel', () => {
  it('produit un classeur .xlsx à 2 feuilles relisibles', () => {
    const fec = buildFec([
      row({ JournalCode: 'VT', EcritureNum: '1', EcritureDate: '20250115', CompteNum: '4110000', Debit: '120,00', Credit: '0' }),
      row({ JournalCode: 'VT', EcritureNum: '1', EcritureDate: '20250115', CompteNum: '7010000', Debit: '0', Credit: '100,00' }) // déséquilibre
    ])
    const report = validateFec(fec, 'export.txt', [], { maxIssues: Number.POSITIVE_INFINITY })
    const buffer = buildFecReportWorkbook(report)

    expect(buffer.byteLength).toBeGreaterThan(0)

    // Relire le classeur généré
    const wb = XLSX.read(buffer, { type: 'array' })
    expect(wb.SheetNames).toEqual(['Synthèse', 'Anomalies'])

    const synth = XLSX.utils.sheet_to_json<string[]>(wb.Sheets['Synthèse'], { header: 1 })
    expect(synth[0]).toEqual(['Rapport de vérification FEC', 'export.txt'])
    expect(synth[1][0]).toBe('Statut global')

    const anomalies = XLSX.utils.sheet_to_json<string[]>(wb.Sheets['Anomalies'], { header: 1 })
    expect(anomalies[0]).toEqual(['Contrôle', 'Statut', 'Ligne', 'Message', 'Suggestion'])
    // Le déséquilibre global doit apparaître avec le statut Erreur
    const flat = anomalies.map(r => r.join('|'))
    expect(flat.some(l => l.startsWith('Équilibre global Débit = Crédit|Erreur'))).toBe(true)
  })

  it('gère un rapport de fichier illisible', () => {
    const report = validateFec('', 'vide.txt')
    const wb = XLSX.read(buildFecReportWorkbook(report), { type: 'array' })
    const synth = XLSX.utils.sheet_to_json<string[]>(wb.Sheets['Synthèse'], { header: 1 })
    expect(synth[1][0]).toBe('Fichier illisible')
  })
})
