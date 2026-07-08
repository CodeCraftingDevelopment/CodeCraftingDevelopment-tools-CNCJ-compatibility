// Génération d'un rapport de vérification FEC au format Excel (.xlsx),
// avec 2 feuilles (Synthèse + Anomalies), en-têtes en gras, cellules de statut
// colorées, largeurs de colonnes et filtre automatique.
import * as XLSX from 'xlsx-js-style';
import { FecReport, CheckStatus } from './fecValidation';

const STATUS_LABEL: Record<CheckStatus, string> = {
  ok: 'OK',
  warning: 'Avertissement',
  error: 'Erreur',
  skipped: 'Non exécuté'
};

// Couleurs façon Excel (remplissage / police) par statut
const STATUS_FILL: Record<CheckStatus, string> = {
  ok: 'C6EFCE',
  warning: 'FFEB9C',
  error: 'FFC7CE',
  skipped: 'E7E6E6'
};
const STATUS_FONT: Record<CheckStatus, string> = {
  ok: '006100',
  warning: '9C6500',
  error: '9C0006',
  skipped: '595959'
};

const HEADER_STYLE = {
  font: { bold: true, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: '374151' } },
  alignment: { vertical: 'center' as const }
};

/** Construit le classeur Excel du rapport et le renvoie en ArrayBuffer prêt à télécharger. */
export const buildFecReportWorkbook = (report: FecReport): ArrayBuffer => {
  const wb = XLSX.utils.book_new();

  // --- Feuille « Synthèse » ---
  const synth: (string | number)[][] = [['Rapport de vérification FEC', report.fileName]];
  if (report.parseError) {
    synth.push(['Fichier illisible', report.parseError]);
  } else {
    synth.push(['Statut global', STATUS_LABEL[report.globalStatus]]);
    synth.push([]);
    synth.push(['Séparateur', report.delimiterLabel]);
    synth.push(['Lignes', report.stats.dataLines]);
    synth.push(['Écritures', report.stats.ecritureCount]);
    synth.push(['Journaux', report.stats.journalCount]);
    synth.push(['Comptes', report.stats.accountCount]);
    synth.push(['Total Débit', report.stats.totalDebit]);
    synth.push(['Total Crédit', report.stats.totalCredit]);
  }
  const wsS = XLSX.utils.aoa_to_sheet(synth);
  wsS['!cols'] = [{ wch: 22 }, { wch: 70 }];
  for (let r = 0; r < synth.length; r++) {
    const ref = XLSX.utils.encode_cell({ r, c: 0 });
    if (wsS[ref]) wsS[ref].s = { font: { bold: true } };
  }
  if (!report.parseError) {
    const statusRef = XLSX.utils.encode_cell({ r: 1, c: 1 });
    if (wsS[statusRef]) {
      wsS[statusRef].s = {
        fill: { fgColor: { rgb: STATUS_FILL[report.globalStatus] } },
        font: { bold: true, color: { rgb: STATUS_FONT[report.globalStatus] } }
      };
    }
  }
  XLSX.utils.book_append_sheet(wb, wsS, 'Synthèse');

  // --- Feuille « Anomalies » ---
  const header = ['Contrôle', 'Statut', 'Ligne', 'Message', 'Suggestion'];
  const rows: (string | number)[][] = [header];
  const rowStatus: CheckStatus[] = ['ok']; // aligné sur l'index de ligne (0 = en-tête)

  for (const check of report.checks) {
    if (check.issues.length === 0) {
      rows.push([check.label, STATUS_LABEL[check.status], '', check.summary, '']);
      rowStatus.push(check.status);
    } else {
      for (const issue of check.issues) {
        rows.push([
          check.label,
          STATUS_LABEL[check.status],
          issue.line ?? '',
          issue.message,
          issue.suggestion ?? ''
        ]);
        rowStatus.push(check.status);
      }
    }
  }

  const wsA = XLSX.utils.aoa_to_sheet(rows);
  wsA['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 8 }, { wch: 70 }, { wch: 60 }];
  wsA['!autofilter'] = {
    ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length - 1, c: header.length - 1 } })
  };

  for (let c = 0; c < header.length; c++) {
    const ref = XLSX.utils.encode_cell({ r: 0, c });
    if (wsA[ref]) wsA[ref].s = HEADER_STYLE;
  }
  for (let r = 1; r < rows.length; r++) {
    const status = rowStatus[r];
    const stRef = XLSX.utils.encode_cell({ r, c: 1 });
    if (wsA[stRef]) {
      wsA[stRef].s = {
        fill: { fgColor: { rgb: STATUS_FILL[status] } },
        font: { bold: true, color: { rgb: STATUS_FONT[status] } },
        alignment: { horizontal: 'center' as const }
      };
    }
    for (const c of [3, 4]) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (wsA[ref]) wsA[ref].s = { alignment: { wrapText: true, vertical: 'top' as const } };
    }
  }
  XLSX.utils.book_append_sheet(wb, wsA, 'Anomalies');

  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
};
