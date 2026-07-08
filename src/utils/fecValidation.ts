// Validation d'un fichier FEC (Fichier des Écritures Comptables, norme fiscale A47 A-1).
// Le FEC est positionnel : 18 champs ordonnés, séparateur tabulation ou « | »,
// dates au format AAAAMMJJ, montants avec décimale « , » ou « . ».

// Les 18 colonnes obligatoires, dans l'ordre imposé par la norme (comptabilité d'engagement).
export const FEC_COLUMNS = [
  'JournalCode',
  'JournalLib',
  'EcritureNum',
  'EcritureDate',
  'CompteNum',
  'CompteLib',
  'CompAuxNum',
  'CompAuxLib',
  'PieceRef',
  'PieceDate',
  'EcritureLib',
  'Debit',
  'Credit',
  'EcritureLet',
  'DateLet',
  'ValidDate',
  'Montantdevise',
  'Idevise'
] as const;

// Index positionnels pour un accès lisible
const IDX = {
  JournalCode: 0,
  EcritureNum: 2,
  EcritureDate: 3,
  CompteNum: 4,
  CompteLib: 5,
  PieceDate: 9,
  Debit: 11,
  Credit: 12,
  EcritureLet: 13,
  DateLet: 14,
  ValidDate: 15,
  Montantdevise: 16,
  Idevise: 17
} as const;

const MAX_ISSUES = 100; // Plafond d'exemples listés par contrôle (évite les rapports illisibles)
const BALANCE_TOLERANCE = 0.01; // Tolérance d'arrondi sur les équilibres (centime)

export type CheckStatus = 'ok' | 'warning' | 'error' | 'skipped';

export interface FecIssue {
  line: number | null; // Numéro de ligne dans le fichier (1-indexé), null si global
  message: string;
  suggestion?: string; // Correction proposée, si une correction sensée existe
}

export interface FecCheck {
  id: string;
  label: string;
  status: CheckStatus;
  summary: string;
  issues: FecIssue[];
  truncated: boolean; // true si des problèmes ont été tronqués au-delà de MAX_ISSUES
}

export interface FecStats {
  dataLines: number;
  totalDebit: number;
  totalCredit: number;
  ecritureCount: number;
  journalCount: number;
  accountCount: number;
}

export interface FecReport {
  fileName: string;
  delimiterLabel: string;
  header: string[];
  globalStatus: CheckStatus;
  checks: FecCheck[];
  stats: FecStats;
  parseError?: string; // Renseigné si le fichier n'a pas pu être parsé du tout
}

interface ParsedFec {
  header: string[];
  delimiter: string;
  delimiterLabel: string;
  rows: Array<{ line: number; cells: string[] }>;
}

// --- Helpers de format ---

const normalizeName = (s: string): string => s.trim().toLowerCase().replace(/[\s_]/g, '');

/** Parse un montant FEC. Retourne NaN si non numérique. Vide => 0. */
export const parseFecAmount = (raw: string | undefined): number => {
  const s = (raw ?? '').trim();
  if (s === '') return 0;
  // Retirer les espaces (séparateurs de milliers éventuels) et normaliser la virgule décimale
  const cleaned = s.replace(/\s/g, '').replace(',', '.');
  if (!/^-?\d*\.?\d+$/.test(cleaned)) return NaN;
  return parseFloat(cleaned);
};

/** Valide une date FEC au format AAAAMMJJ (et cohérence calendaire). */
export const isValidFecDate = (raw: string | undefined): boolean => {
  const s = (raw ?? '').trim();
  if (!/^\d{8}$/.test(s)) return false;
  const year = parseInt(s.slice(0, 4), 10);
  const month = parseInt(s.slice(4, 6), 10);
  const day = parseInt(s.slice(6, 8), 10);
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
};

/** Normalise un numéro de compte comme l'application (7 chiffres). */
const normalizeAccount7 = (code: string): string => {
  const c = code.trim();
  if (c.length > 7) return c.slice(0, 7);
  if (c.length < 7 && /^\d+$/.test(c)) return c.padEnd(7, '0');
  return c;
};

/**
 * Tente de reformater une date reconnaissable vers le format FEC AAAAMMJJ.
 * Gère AAAA-MM-JJ, JJ/MM/AAAA, JJ-MM-AAAA, JJ.MM.AAAA. Retourne null si non convertible.
 */
export const suggestFecDate = (raw: string | undefined): string | null => {
  const s = (raw ?? '').trim();
  if (s === '') return null;
  let y: string | undefined;
  let m: string | undefined;
  let d: string | undefined;

  let match = s.match(/^(\d{4})[-/.](\d{2})[-/.](\d{2})$/); // AAAA-MM-JJ
  if (match) {
    [, y, m, d] = match;
  } else {
    match = s.match(/^(\d{2})[-/.](\d{2})[-/.](\d{4})$/); // JJ/MM/AAAA
    if (match) {
      [, d, m, y] = match;
    }
  }
  if (!y || !m || !d) return null;
  const candidate = `${y}${m}${d}`;
  return isValidFecDate(candidate) ? candidate : null;
};

/** Nombre de zéros terminaux d'un code (indicateur de généricité : plus il y en a, plus le compte est « parent »). */
const trailingZeros = (code: string): number => {
  let n = 0;
  for (let i = code.length - 1; i >= 0 && code[i] === '0'; i--) n += 1;
  return n;
};

/**
 * Recherche le compte PCG de référence, en privilégiant le compte le plus **générique**
 * (compte parent/racine), par paliers d'élargissement :
 *   1. racine de la famille à 4 chiffres (ex. 5121000 « Comptes en euros » pour 5121300) ;
 *   2. générique de la famille à 3 chiffres (ex. 6260000 pour 6261000, 7060000 pour 7067000 ;
 *      un compte-vue « 706 » est normalisé en 7060000 et couvert par ce palier) ;
 *   3. à défaut, compte le plus générique/proche dans la famille à 4 chiffres.
 */
const findNearestPcgCode = (
  code: string,
  pcgSet: Set<string>,
  pcgByPrefix: Map<string, string[]>
): string | null => {
  const normalized = normalizeAccount7(code);
  if (normalized.length < 5 || !/^\d+$/.test(normalized)) return null;
  const prefix4 = normalized.slice(0, 4);
  const prefix3 = normalized.slice(0, 3);

  // 1. Racine générique de la famille à 4 chiffres
  const root4 = `${prefix4}000`;
  if (root4 !== normalized && pcgSet.has(root4)) return root4;

  // 2. Générique de la famille à 3 chiffres (le compte-vue « 706 » est normalisé en 7060000)
  const root3 = `${prefix3}0000`;
  if (root3 !== normalized && pcgSet.has(root3)) return root3;

  // 3. Repli : le plus générique (zéros terminaux), puis le plus proche numériquement
  const candidates = pcgByPrefix.get(prefix4);
  if (!candidates || candidates.length === 0) return null;
  const codeNum = parseInt(normalized, 10);
  return candidates.reduce((best, current) => {
    const cz = trailingZeros(current);
    const bz = trailingZeros(best);
    if (cz !== bz) return cz > bz ? current : best;
    return Math.abs(codeNum - parseInt(current, 10)) < Math.abs(codeNum - parseInt(best, 10)) ? current : best;
  });
};

const detectDelimiter = (headerLine: string): { delimiter: string; label: string } => {
  const candidates: Array<{ delimiter: string; label: string }> = [
    { delimiter: '\t', label: 'tabulation' },
    { delimiter: '|', label: 'barre verticale « | »' },
    { delimiter: ';', label: 'point-virgule « ; »' }
  ];
  // On retient le séparateur qui découpe l'en-tête en un nombre de colonnes le plus proche de 18
  let best = candidates[0];
  let bestScore = -1;
  for (const c of candidates) {
    const count = headerLine.split(c.delimiter).length;
    const score = count === 18 ? 1000 : count > 1 ? count : 0;
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
};

const splitLines = (text: string): string[] => text.replace(/\r\n?/g, '\n').split('\n');

const parseFec = (text: string): ParsedFec | { error: string } => {
  const lines = splitLines(text);
  // Première ligne non vide = en-tête
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() !== '') {
      headerIndex = i;
      break;
    }
  }
  if (headerIndex === -1) {
    return { error: 'Le fichier est vide.' };
  }

  const { delimiter, label } = detectDelimiter(lines[headerIndex]);
  const header = lines[headerIndex].split(delimiter).map(c => c.trim());

  const rows: Array<{ line: number; cells: string[] }> = [];
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') continue; // On ignore les lignes vides
    rows.push({ line: i + 1, cells: line.split(delimiter) });
  }

  return { header, delimiter, delimiterLabel: label, rows };
};

// --- Contrôles ---

const cell = (cells: string[], index: number): string => (cells[index] ?? '').trim();

/** Point d'entrée : valide un texte FEC et produit un rapport structuré. */
/**
 * Parse le fichier de correspondances issu de l'intégration PCG
 * (colonnes account_title;original_client_code;final_code, valeurs éventuellement guillemetées).
 * Retourne une Map : code client d'origine -> code CNCJ final.
 */
export const parseAccountCorrespondences = (text: string): Map<string, string> => {
  const map = new Map<string, string>();
  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    if (line.trim() === '') continue;
    const cells = line.split(';').map(c => c.trim().replace(/^"(.*)"$/, '$1'));
    if (cells.length < 3) continue;
    const original = cells[1];
    const final = cells[2];
    if (/^\d+$/.test(original) && /^\d+$/.test(final)) {
      map.set(original, final);
    }
  }
  return map;
};

export interface FecAccount {
  code: string;
  label: string;
}

/**
 * Extrait la liste des comptes (CompteNum + CompteLib) réellement utilisés dans un FEC.
 * Un compte n'apparaît qu'une fois ; on retient le premier libellé non vide rencontré.
 * Sert à alimenter l'intégration PCG avec les comptes présents dans le FEC.
 */
export const extractFecAccounts = (text: string): FecAccount[] => {
  const parsed = parseFec(text);
  if ('error' in parsed) return [];
  const labels = new Map<string, string>();
  for (const r of parsed.rows) {
    const code = cell(r.cells, IDX.CompteNum);
    if (code === '') continue;
    const existing = labels.get(code);
    if (existing === undefined || existing === '') {
      labels.set(code, cell(r.cells, IDX.CompteLib));
    }
  }
  return [...labels.entries()].map(([code, label]) => ({ code, label }));
};

/**
 * Corrige un FEC pour Axelor : sur chaque ligne de données, renseigne
 * Idevise = « EUR » et Montantdevise = valeur absolue du Débit (si > 0) sinon du Crédit.
 * Le reste du fichier (en-tête, autres colonnes, mise en forme) est préservé tel quel.
 */
export const buildCorrectedFec = (text: string): string => {
  const parsed = parseFec(text);
  if ('error' in parsed) return text;
  const delimiter = parsed.delimiter;
  const eol = text.includes('\r\n') ? '\r\n' : '\n';

  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() !== '') { headerIdx = i; break; }
  }

  const out = lines.map((line, i) => {
    if (i <= headerIdx || line.trim() === '') return line; // en-tête et lignes vides inchangés
    const cells = line.split(delimiter);
    while (cells.length < 18) cells.push('');
    const debit = Math.abs(parseFecAmount(cells[IDX.Debit] ?? '') || 0);
    const credit = Math.abs(parseFecAmount(cells[IDX.Credit] ?? '') || 0);
    const expected = debit > 0 ? debit : credit;
    cells[IDX.Montantdevise] = expected.toFixed(2).replace('.', ','); // décimale française comme Débit/Crédit
    cells[IDX.Idevise] = 'EUR';
    return cells.join(delimiter);
  });

  return out.join(eol);
};

export const validateFec = (
  text: string,
  fileName: string,
  pcgAccounts: Array<{ number: string; name?: string }> = [],
  options: { maxIssues?: number; correspondences?: Map<string, string> } = {}
): FecReport => {
  const maxIssues = options.maxIssues ?? MAX_ISSUES;
  const correspondences = options.correspondences;
  const parsed = parseFec(text);

  if ('error' in parsed) {
    return {
      fileName,
      delimiterLabel: '—',
      header: [],
      globalStatus: 'error',
      checks: [],
      stats: { dataLines: 0, totalDebit: 0, totalCredit: 0, ecritureCount: 0, journalCount: 0, accountCount: 0 },
      parseError: parsed.error
    };
  }

  const { header, rows, delimiterLabel } = parsed;
  const checks: FecCheck[] = [];

  const makeCheck = (
    id: string,
    label: string,
    issues: FecIssue[],
    okSummary: string,
    problemSummary: (n: number) => string,
    problemStatus: CheckStatus = 'error'
  ): FecCheck => {
    const truncated = issues.length > maxIssues;
    return {
      id,
      label,
      status: issues.length === 0 ? 'ok' : problemStatus,
      summary: issues.length === 0 ? okSummary : problemSummary(issues.length),
      issues: issues.slice(0, maxIssues),
      truncated
    };
  };

  // === Structure & format ===

  // 0. Guillemets englobant les lignes (non prévu par la norme FEC : chaque ligne/champ
  //    ne doit pas être encadré par des « " »). On signale sans modifier le contenu lu.
  const quoteIssues: FecIssue[] = [];
  const headerQuoted = (header[0]?.startsWith('"') ?? false) || (header[header.length - 1]?.endsWith('"') ?? false);
  if (headerQuoted) {
    quoteIssues.push({
      line: 1,
      message: `L'en-tête est encadré par des guillemets « " ».`,
      suggestion: `Retirer les guillemets encadrant les lignes.`
    });
  }
  let quotedRows = 0;
  let firstQuotedLine: number | null = null;
  for (const r of rows) {
    const first = r.cells[0] ?? '';
    const last = r.cells[r.cells.length - 1] ?? '';
    if (first.startsWith('"') || last.endsWith('"')) {
      quotedRows += 1;
      if (firstQuotedLine === null) firstQuotedLine = r.line;
    }
  }
  if (quotedRows > 0) {
    quoteIssues.push({
      line: firstQuotedLine,
      message: `${quotedRows} ligne(s) encadrée(s) par des guillemets « " ».`,
      suggestion: `Retirer les guillemets en début et fin de chaque ligne (non conforme à la norme FEC).`
    });
  }
  checks.push({
    id: 'structure-guillemets',
    label: 'Guillemets englobants',
    status: quoteIssues.length === 0 ? 'ok' : 'warning',
    summary:
      quoteIssues.length === 0
        ? `Aucun guillemet englobant détecté.`
        : `Les lignes sont encadrées par des guillemets « " » (non prévu par la norme FEC) : cela fausse la 1ʳᵉ et la dernière colonne.`,
    issues: quoteIssues,
    truncated: false
  });

  // 1. Nombre et noms des colonnes
  const columnIssues: FecIssue[] = [];
  if (header.length !== 18) {
    columnIssues.push({
      line: 1,
      message: `18 colonnes attendues, ${header.length} trouvée(s).`
    });
  }
  FEC_COLUMNS.forEach((expected, i) => {
    const actual = header[i];
    if (actual === undefined) {
      columnIssues.push({ line: 1, message: `Colonne ${i + 1} manquante (attendue : « ${expected} »).` });
    } else if (normalizeName(actual) !== normalizeName(expected)) {
      columnIssues.push({
        line: 1,
        message: `Colonne ${i + 1} : « ${actual} » au lieu de « ${expected} ».`,
        suggestion: `Renommer l'en-tête en « ${expected} ».`
      });
    }
  });
  checks.push(
    makeCheck(
      'structure-colonnes',
      'Structure des 18 colonnes',
      columnIssues,
      `Les 18 colonnes normées sont présentes et correctement nommées.`,
      n => `${n} anomalie(s) sur l'en-tête des colonnes.`,
      // Un mauvais nombre de colonnes est bloquant, un simple écart de nom est un avertissement
      header.length !== 18 ? 'error' : 'warning'
    )
  );

  // 2. Largeur des lignes (nombre de champs par ligne)
  const widthIssues: FecIssue[] = [];
  for (const r of rows) {
    if (r.cells.length !== header.length) {
      widthIssues.push({
        line: r.line,
        message: `${r.cells.length} champ(s) au lieu de ${header.length}.`
      });
    }
  }
  checks.push(
    makeCheck(
      'structure-largeur',
      'Nombre de champs par ligne',
      widthIssues,
      `Toutes les lignes ont ${header.length} champs.`,
      n => `${n} ligne(s) avec un nombre de champs incorrect.`
    )
  );

  // 3. EcritureDate obligatoire et valide (AAAAMMJJ)
  const ecritureDateIssues: FecIssue[] = [];
  for (const r of rows) {
    const v = cell(r.cells, IDX.EcritureDate);
    if (!isValidFecDate(v)) {
      const fix = suggestFecDate(v);
      ecritureDateIssues.push({
        line: r.line,
        message: v === '' ? `EcritureDate vide.` : `EcritureDate invalide : « ${v} » (attendu AAAAMMJJ).`,
        suggestion: fix ? `Reformater en « ${fix} ».` : undefined
      });
    }
  }
  checks.push(
    makeCheck(
      'format-date-ecriture',
      'Format des dates d\'écriture (AAAAMMJJ)',
      ecritureDateIssues,
      `Toutes les dates d'écriture sont valides.`,
      n => `${n} date(s) d'écriture invalide(s) ou vide(s).`
    )
  );

  // 4. Dates optionnelles valides si renseignées (PieceDate, DateLet, ValidDate)
  const optDateIssues: FecIssue[] = [];
  const optionalDates: Array<[number, string]> = [
    [IDX.PieceDate, 'PieceDate'],
    [IDX.DateLet, 'DateLet'],
    [IDX.ValidDate, 'ValidDate']
  ];
  for (const r of rows) {
    for (const [idx, name] of optionalDates) {
      const v = cell(r.cells, idx);
      if (v !== '' && !isValidFecDate(v)) {
        const fix = suggestFecDate(v);
        optDateIssues.push({
          line: r.line,
          message: `${name} invalide : « ${v} » (attendu AAAAMMJJ).`,
          suggestion: fix ? `Reformater en « ${fix} ».` : undefined
        });
      }
    }
  }
  checks.push(
    makeCheck(
      'format-dates-optionnelles',
      'Format des dates optionnelles',
      optDateIssues,
      `Les dates optionnelles renseignées sont valides.`,
      n => `${n} date(s) optionnelle(s) au format incorrect.`,
      'warning'
    )
  );

  // 5. Montants Débit/Crédit numériques
  const amountIssues: FecIssue[] = [];
  for (const r of rows) {
    const dRaw = cell(r.cells, IDX.Debit);
    const cRaw = cell(r.cells, IDX.Credit);
    if (Number.isNaN(parseFecAmount(dRaw))) {
      amountIssues.push({ line: r.line, message: `Debit non numérique : « ${dRaw} ».` });
    }
    if (Number.isNaN(parseFecAmount(cRaw))) {
      amountIssues.push({ line: r.line, message: `Credit non numérique : « ${cRaw} ».` });
    }
  }
  checks.push(
    makeCheck(
      'format-montants',
      'Montants Débit / Crédit numériques',
      amountIssues,
      `Tous les montants Débit et Crédit sont numériques.`,
      n => `${n} montant(s) non numérique(s).`
    )
  );

  // 6. Champs obligatoires non vides (JournalCode, EcritureNum, CompteNum)
  const mandatoryIssues: FecIssue[] = [];
  for (const r of rows) {
    if (cell(r.cells, IDX.JournalCode) === '') mandatoryIssues.push({ line: r.line, message: `JournalCode vide.` });
    if (cell(r.cells, IDX.EcritureNum) === '') mandatoryIssues.push({ line: r.line, message: `EcritureNum vide.` });
    if (cell(r.cells, IDX.CompteNum) === '') mandatoryIssues.push({ line: r.line, message: `CompteNum vide.` });
  }
  checks.push(
    makeCheck(
      'champs-obligatoires',
      'Champs obligatoires renseignés',
      mandatoryIssues,
      `JournalCode, EcritureNum et CompteNum sont toujours renseignés.`,
      n => `${n} champ(s) obligatoire(s) vide(s).`
    )
  );

  // 7. Montant devise / Idevise (exigence Axelor) : chaque ligne doit avoir
  //    Idevise = « EUR » et Montantdevise = valeur absolue du Débit (si > 0) sinon du Crédit.
  const deviseIssues: FecIssue[] = [];
  for (const r of rows) {
    const montantRaw = cell(r.cells, IDX.Montantdevise);
    const idevise = cell(r.cells, IDX.Idevise);
    const debit = Math.abs(parseFecAmount(cell(r.cells, IDX.Debit)) || 0);
    const credit = Math.abs(parseFecAmount(cell(r.cells, IDX.Credit)) || 0);
    const expected = debit > 0 ? debit : credit;

    const problems: string[] = [];
    if (idevise !== 'EUR') {
      problems.push(idevise === '' ? `Idevise vide` : `Idevise « ${idevise} » ≠ « EUR »`);
    }
    const montantNum = parseFecAmount(montantRaw);
    if (montantRaw === '') {
      problems.push(`Montantdevise vide`);
    } else if (Number.isNaN(montantNum)) {
      problems.push(`Montantdevise non numérique « ${montantRaw} »`);
    } else if (Math.abs(montantNum - expected) > BALANCE_TOLERANCE) {
      problems.push(`Montantdevise ${montantNum.toFixed(2)} ≠ ${expected.toFixed(2)} (|Débit ou Crédit|)`);
    }

    if (problems.length > 0) {
      deviseIssues.push({
        line: r.line,
        message: `${problems.join(' ; ')}.`,
        suggestion: `Renseigner Idevise = « EUR » et Montantdevise = ${expected.toFixed(2)}.`
      });
    }
  }
  checks.push(
    makeCheck(
      'coherence-devise',
      'Montant devise / Idevise (Axelor)',
      deviseIssues,
      `Toutes les lignes ont Idevise = « EUR » et Montantdevise = valeur absolue du Débit/Crédit.`,
      n => `${n} ligne(s) non conformes (Idevise ≠ EUR ou Montantdevise incorrect/absent).`,
      'error'
    )
  );

  // === Équilibres comptables ===

  let totalDebit = 0;
  let totalCredit = 0;
  // Regroupement par écriture = JournalCode + EcritureNum (unité comptable)
  const ecritures = new Map<string, { debit: number; credit: number; firstLine: number; dateCounts: Map<string, number>; journals: Set<string> }>();
  const journals = new Set<string>();
  const accounts = new Set<string>();
  const accountLabels = new Map<string, string>(); // CompteNum -> premier CompteLib non vide rencontré

  for (const r of rows) {
    const debit = parseFecAmount(cell(r.cells, IDX.Debit));
    const credit = parseFecAmount(cell(r.cells, IDX.Credit));
    const d = Number.isNaN(debit) ? 0 : debit;
    const c = Number.isNaN(credit) ? 0 : credit;
    totalDebit += d;
    totalCredit += c;

    const journal = cell(r.cells, IDX.JournalCode);
    const ecritureNum = cell(r.cells, IDX.EcritureNum);
    const compteNum = cell(r.cells, IDX.CompteNum);
    journals.add(journal);
    if (compteNum !== '') {
      accounts.add(compteNum);
      if (!accountLabels.has(compteNum)) {
        const lib = cell(r.cells, IDX.CompteLib);
        if (lib !== '') accountLabels.set(compteNum, lib);
      }
    }

    const key = `${journal}|${ecritureNum}`;
    let e = ecritures.get(key);
    if (!e) {
      e = { debit: 0, credit: 0, firstLine: r.line, dateCounts: new Map(), journals: new Set() };
      ecritures.set(key, e);
    }
    e.debit += d;
    e.credit += c;
    const ecritureDate = cell(r.cells, IDX.EcritureDate);
    e.dateCounts.set(ecritureDate, (e.dateCounts.get(ecritureDate) ?? 0) + 1);
    e.journals.add(journal);
  }

  // 7. Équilibre global Débit = Crédit
  const globalDiff = totalDebit - totalCredit;
  const globalBalanced = Math.abs(globalDiff) <= BALANCE_TOLERANCE;
  checks.push({
    id: 'equilibre-global',
    label: 'Équilibre global Débit = Crédit',
    status: globalBalanced ? 'ok' : 'error',
    summary: globalBalanced
      ? `Équilibré : Débit = Crédit = ${totalDebit.toFixed(2)}.`
      : `Déséquilibre global : Débit ${totalDebit.toFixed(2)} − Crédit ${totalCredit.toFixed(2)} = ${globalDiff.toFixed(2)}.`,
    issues: [],
    truncated: false
  });

  // 8. Équilibre par écriture
  const ecritureBalanceIssues: FecIssue[] = [];
  for (const [key, e] of ecritures) {
    const diff = e.debit - e.credit;
    if (Math.abs(diff) > BALANCE_TOLERANCE) {
      const [journal, num] = key.split('|');
      ecritureBalanceIssues.push({
        line: e.firstLine,
        message: `Écriture ${journal}/${num} déséquilibrée : Débit ${e.debit.toFixed(2)} − Crédit ${e.credit.toFixed(2)} = ${diff.toFixed(2)}.`
      });
    }
  }
  checks.push(
    makeCheck(
      'equilibre-ecriture',
      'Équilibre par écriture (EcritureNum)',
      ecritureBalanceIssues,
      `Toutes les écritures sont équilibrées.`,
      n => `${n} écriture(s) déséquilibrée(s).`
    )
  );

  // === Cohérence des écritures ===

  // 9. Date d'écriture cohérente au sein d'une même écriture
  const dateCoherenceIssues: FecIssue[] = [];
  for (const [key, e] of ecritures) {
    const validDates = [...e.dateCounts.entries()].filter(([d]) => d !== '');
    if (validDates.length > 1) {
      const [journal, num] = key.split('|');
      // Date dominante = celle qui apparaît sur le plus de lignes de l'écriture
      const dominant = validDates.reduce((best, cur) => (cur[1] > best[1] ? cur : best))[0];
      dateCoherenceIssues.push({
        line: e.firstLine,
        message: `Écriture ${journal}/${num} : ${validDates.length} dates différentes (${validDates.map(([d]) => d).join(', ')}).`,
        suggestion: `Harmoniser toutes les lignes sur « ${dominant} » (date majoritaire).`
      });
    }
  }
  checks.push(
    makeCheck(
      'coherence-date-ecriture',
      'Date homogène par écriture',
      dateCoherenceIssues,
      `Chaque écriture a une date d'écriture unique.`,
      n => `${n} écriture(s) avec des dates d'écriture divergentes.`,
      'warning'
    )
  );

  // NB : pas de contrôle « lettrage sans DateLet » — la norme FEC (A47 A-1) définit EcritureLet
  // et DateLet comme optionnels et indépendants. Le format de DateLet, quand elle est renseignée,
  // reste vérifié par le contrôle « Format des dates optionnelles ».

  // === Cohérence avec le plan comptable (PCG) ===

  if (pcgAccounts.length === 0) {
    checks.push({
      id: 'coherence-pcg',
      label: 'Cohérence des comptes avec le PCG',
      status: 'skipped',
      summary: `Non exécuté : aucun plan comptable fourni (déposez le plan comptable complet ci-dessus, ou chargez un PCG via « Integration PCG »).`,
      issues: [],
      truncated: false
    });
  } else {
    const pcgSet = new Set<string>();
    const pcgByPrefix = new Map<string, string[]>();
    const pcgNameByCode = new Map<string, string>(); // code (brut + normalisé 7) -> libellé PCG
    for (const a of pcgAccounts) {
      const num = a.number.trim();
      pcgSet.add(num);
      pcgSet.add(normalizeAccount7(a.number));
      if (a.name) {
        if (!pcgNameByCode.has(num)) pcgNameByCode.set(num, a.name);
        const norm = normalizeAccount7(a.number);
        if (!pcgNameByCode.has(norm)) pcgNameByCode.set(norm, a.name);
      }
      if (num.length >= 5 && /^\d+$/.test(num)) {
        const prefix = num.slice(0, 4);
        const bucket = pcgByPrefix.get(prefix);
        if (bucket) bucket.push(num);
        else pcgByPrefix.set(prefix, [num]);
      }
    }
    const pcgHas = (code: string): boolean => pcgSet.has(code) || pcgSet.has(normalizeAccount7(code));
    const missing: FecIssue[] = [];
    const seen = new Set<string>();
    let corrResolved = 0; // comptes reconnus via la table de correspondances
    for (const compte of accounts) {
      if (seen.has(compte)) continue;
      seen.add(compte);
      if (pcgHas(compte)) continue;
      // Reconnaître les comptes déjà mappés par l'intégration PCG : leur présence dans la table
      // de correspondances suffit (le code final n'a pas besoin d'être dans le PCG uploadé ici).
      if (correspondences?.has(compte)) {
        corrResolved += 1;
        continue;
      }
      const lib = accountLabels.get(compte);
      const nearest = findNearestPcgCode(compte, pcgSet, pcgByPrefix);
      const nearestName = nearest ? pcgNameByCode.get(nearest) : undefined;
      missing.push({
        line: null,
        message: `Compte « ${compte} »${lib ? ` (${lib})` : ''} absent du plan comptable chargé.`,
        suggestion: nearest
          ? `Compte PCG le plus proche : « ${nearest} »${nearestName ? ` (${nearestName})` : ''}.`
          : undefined
      });
    }
    const corrOk = corrResolved > 0 ? ` (dont ${corrResolved} via correspondance)` : '';
    const corrAside = corrResolved > 0 ? ` ; ${corrResolved} autre(s) reconnu(s) via correspondance` : '';
    checks.push(
      makeCheck(
        'coherence-pcg',
        'Cohérence des comptes avec le PCG',
        missing,
        `Tous les comptes du FEC (${accounts.size}) existent dans le plan comptable${corrOk}.`,
        n => `${n} compte(s) du FEC introuvable(s) dans le PCG${corrAside} (comptes de tiers/auxiliaires possibles).`,
        'warning'
      )
    );
  }

  // === Statut global ===
  const hasError = checks.some(c => c.status === 'error');
  const hasWarning = checks.some(c => c.status === 'warning');
  const globalStatus: CheckStatus = hasError ? 'error' : hasWarning ? 'warning' : 'ok';

  return {
    fileName,
    delimiterLabel,
    header,
    globalStatus,
    checks,
    stats: {
      dataLines: rows.length,
      totalDebit,
      totalCredit,
      ecritureCount: ecritures.size,
      journalCount: journals.size,
      accountCount: accounts.size
    }
  };
};

const CHECK_STATUS_LABEL: Record<CheckStatus, string> = {
  ok: 'OK',
  warning: 'Avertissement',
  error: 'Erreur',
  skipped: 'Non exécuté'
};

/**
 * Génère le contenu CSV d'un rapport de vérification FEC (une ligne par anomalie),
 * ouvrable dans Excel (séparateur « ; », BOM UTF-8). Pour un export exhaustif,
 * régénérer le rapport avec { maxIssues: Infinity } avant d'appeler cette fonction.
 */
export const buildFecReportCsv = (report: FecReport): string => {
  const esc = (v: string): string => {
    const s = v ?? '';
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines: string[] = [];
  // Préambule de synthèse
  lines.push(esc(`Rapport de vérification FEC : ${report.fileName}`));
  if (report.parseError) {
    lines.push(esc(`Fichier illisible : ${report.parseError}`));
    return '﻿' + lines.join('\r\n');
  }
  lines.push(esc(`Statut global : ${CHECK_STATUS_LABEL[report.globalStatus]}`));
  lines.push(
    esc(
      `Séparateur : ${report.delimiterLabel} — Lignes : ${report.stats.dataLines} — ` +
        `Écritures : ${report.stats.ecritureCount} — Journaux : ${report.stats.journalCount} — ` +
        `Comptes : ${report.stats.accountCount} — Débit : ${report.stats.totalDebit.toFixed(2)} — ` +
        `Crédit : ${report.stats.totalCredit.toFixed(2)}`
    )
  );
  lines.push(''); // ligne vide de séparation

  // Tableau des contrôles / anomalies
  lines.push(['Contrôle', 'Statut', 'Ligne', 'Message', 'Suggestion'].join(';'));
  for (const check of report.checks) {
    if (check.issues.length === 0) {
      lines.push([esc(check.label), CHECK_STATUS_LABEL[check.status], '', esc(check.summary), ''].join(';'));
    } else {
      for (const issue of check.issues) {
        lines.push(
          [
            esc(check.label),
            CHECK_STATUS_LABEL[check.status],
            issue.line !== null ? String(issue.line) : '',
            esc(issue.message),
            esc(issue.suggestion ?? '')
          ].join(';')
        );
      }
    }
  }

  return '﻿' + lines.join('\r\n');
};
