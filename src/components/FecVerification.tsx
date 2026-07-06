import React, { useState, useCallback, useMemo } from 'react';
import { Account } from '../types/accounts';
import { DropZone } from './DropZone';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import { parseCSVFile } from '../utils/accountUtils';
import { validateFec, FecReport, FecCheck, CheckStatus } from '../utils/fecValidation';

interface FecVerificationProps {
  pcgAccounts: Account[]; // PCG déjà chargé en session (via « Integration PCG »), s'il existe
  onBack: () => void;
}

const STATUS_META: Record<CheckStatus, { icon: string; badge: string; ring: string }> = {
  ok: { icon: '✅', badge: 'bg-green-100 text-green-800', ring: 'border-green-200 bg-green-50' },
  warning: { icon: '⚠️', badge: 'bg-orange-100 text-orange-800', ring: 'border-orange-200 bg-orange-50' },
  error: { icon: '⛔', badge: 'bg-red-100 text-red-800', ring: 'border-red-200 bg-red-50' },
  skipped: { icon: '➖', badge: 'bg-gray-100 text-gray-600', ring: 'border-gray-200 bg-gray-50' }
};

const formatAmount = (n: number): string =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CheckCard: React.FC<{ check: FecCheck }> = ({ check }) => {
  const [expanded, setExpanded] = useState(false);
  const meta = STATUS_META[check.status];
  const hasIssues = check.issues.length > 0;

  return (
    <div className={`border rounded-lg overflow-hidden ${meta.ring}`}>
      <button
        type="button"
        onClick={() => hasIssues && setExpanded(e => !e)}
        className={`w-full px-4 py-3 flex items-center justify-between gap-3 text-left ${hasIssues ? 'cursor-pointer' : 'cursor-default'}`}
        aria-expanded={expanded}
      >
        <div className="flex items-start gap-3">
          <span className="text-xl leading-none mt-0.5" aria-hidden="true">{meta.icon}</span>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">{check.label}</h4>
            <p className="text-xs text-gray-600 mt-0.5">{check.summary}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasIssues && (
            <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${meta.badge}`}>
              {check.issues.length}{check.truncated ? '+' : ''}
            </span>
          )}
          {hasIssues && (
            <span className={`text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} aria-hidden="true">▼</span>
          )}
        </div>
      </button>

      {expanded && hasIssues && (
        <div className="border-t border-black/5 bg-white/60 px-4 py-3">
          <ul className="space-y-1 text-xs text-gray-700 max-h-64 overflow-y-auto font-mono">
            {check.issues.map((issue, i) => (
              <li key={i}>
                <div className="flex gap-2">
                  {issue.line !== null && (
                    <span className="text-gray-400 shrink-0">L{issue.line}</span>
                  )}
                  <span>{issue.message}</span>
                </div>
                {issue.suggestion && (
                  <div className="flex gap-2 text-green-700 mt-0.5">
                    {issue.line !== null && <span className="shrink-0 invisible">L{issue.line}</span>}
                    <span>↳ {issue.suggestion}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {check.truncated && (
            <p className="text-[11px] text-gray-500 mt-2 italic">
              Seuls les 100 premiers cas sont affichés.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export const FecVerification: React.FC<FecVerificationProps> = ({ pcgAccounts, onBack }) => {
  // Fichier FEC
  const [fecText, setFecText] = useState<string | null>(null);
  const [fecFileName, setFecFileName] = useState<string>('');
  const [fecLoading, setFecLoading] = useState(false);
  const [fecError, setFecError] = useState<string | null>(null);

  // Fichier PCG complet uploadé (optionnel) : prioritaire sur le PCG de session
  const [pcgUploaded, setPcgUploaded] = useState<Array<{ number: string }> | null>(null);
  const [pcgFileName, setPcgFileName] = useState<string>('');
  const [pcgLoading, setPcgLoading] = useState(false);
  const [pcgError, setPcgError] = useState<string | null>(null);

  // PCG effectif : le fichier uploadé s'il existe, sinon celui de la session
  const effectivePcg = useMemo<Array<{ number: string }>>(
    () => pcgUploaded ?? pcgAccounts,
    [pcgUploaded, pcgAccounts]
  );

  // Le rapport se recalcule dès que le FEC ou le PCG effectif change
  const report = useMemo<FecReport | null>(
    () => (fecText !== null ? validateFec(fecText, fecFileName, effectivePcg) : null),
    [fecText, fecFileName, effectivePcg]
  );

  const handleFecFile = useCallback(async (file: File) => {
    setFecLoading(true);
    setFecError(null);
    setFecText(null);
    setFecFileName(file.name);
    try {
      const text = await file.text();
      setFecText(text);
    } catch (err) {
      setFecError(`Impossible de lire le fichier : ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setFecLoading(false);
    }
  }, []);

  const handlePcgFile = useCallback(async (file: File) => {
    setPcgLoading(true);
    setPcgError(null);
    setPcgFileName(file.name);
    try {
      const result = await parseCSVFile(file, true);
      if (result.accounts.length === 0) {
        setPcgError('Aucun compte détecté dans ce fichier (colonne « code » attendue).');
        setPcgUploaded(null);
      } else {
        setPcgUploaded(result.accounts.map(a => ({ number: a.number })));
      }
    } catch (err) {
      setPcgError(`Impossible de lire le fichier : ${err instanceof Error ? err.message : String(err)}`);
      setPcgUploaded(null);
    } finally {
      setPcgLoading(false);
    }
  }, []);

  const pcgDnd = useDragAndDrop({ onDrop: handlePcgFile, acceptedTypes: ['.csv'] });
  const fecDnd = useDragAndDrop({ onDrop: handleFecFile, acceptedTypes: [] });

  const globalMeta = report ? STATUS_META[report.globalStatus] : null;
  const globalLabel: Record<CheckStatus, string> = {
    ok: 'Fichier conforme',
    warning: 'Conforme avec avertissements',
    error: 'Anomalies bloquantes détectées',
    skipped: '—'
  };

  // Libellé de la source PCG utilisée pour le contrôle de cohérence
  const pcgSourceLabel =
    pcgUploaded !== null
      ? `Fichier « ${pcgFileName} » (${pcgUploaded.length} comptes)`
      : pcgAccounts.length > 0
      ? `PCG chargé en session (${pcgAccounts.length} comptes)`
      : 'Aucun — le contrôle de cohérence des comptes sera ignoré';

  return (
    <>
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3">
          <span className="text-3xl" aria-hidden="true">🔎</span>
          <h1 className="text-3xl font-bold text-gray-900">Vérification Fichier FEC</h1>
        </div>
        <p className="text-gray-600 mt-2">
          Contrôle de conformité d'un fichier FEC client (norme A47 A-1)
        </p>
      </div>

      <div className="mb-6">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
        >
          ← Retour aux choix
        </button>
      </div>

      {/* Zones d'upload : d'abord le plan comptable (obligatoire), puis le FEC */}
      <div className="space-y-5 mb-6">
        {/* 1. Plan comptable PCG + CNCJ + comptes clients (obligatoire) */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <span className="mr-2 px-1.5 py-0.5 text-[11px] font-bold rounded bg-gray-700 text-white">1</span>
            📊 PCG avec CNCJ et comptes clients <span className="font-normal text-gray-400">(optionnel)</span>
          </label>
          <input
            ref={pcgDnd.fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={pcgDnd.handlers.handleFileChange}
            aria-label="Sélectionner le plan comptable complet"
          />
          <DropZone
            dragState={pcgDnd.dragState}
            loading={pcgLoading}
            fileInfo={pcgUploaded !== null ? { name: pcgFileName, size: '', rowCount: pcgUploaded.length, loadStatus: 'success' } : null}
            onDragOver={pcgDnd.handlers.handleDragOver}
            onDragLeave={pcgDnd.handlers.handleDragLeave}
            onDrop={pcgDnd.handlers.handleDrop}
            onClick={pcgDnd.handlers.handleButtonClick}
            onKeyDown={(e) => pcgDnd.handlers.handleKeyDown(e, pcgDnd.handlers.handleButtonClick)}
            ariaLabel="Déposer ou sélectionner le plan comptable complet"
            dataTestId="pcg-dropzone"
          >
            <div className="py-4">
              <div className="text-3xl mb-2" aria-hidden="true">📊</div>
              {pcgLoading ? (
                <p className="text-sm text-gray-600">Lecture en cours…</p>
              ) : pcgUploaded !== null ? (
                <p className="text-sm text-gray-700 font-medium">✓ {pcgFileName} — {pcgUploaded.length} comptes</p>
              ) : (
                <>
                  <p className="text-sm text-gray-700 font-medium">Déposez le plan comptable ou cliquez</p>
                  <p className="text-xs text-gray-500 mt-1">.csv format Axelor (colonne « code ») — PCG avec CNCJ et comptes clients</p>
                </>
              )}
            </div>
          </DropZone>
          {pcgError && (
            <div className="mt-2 bg-red-50 border border-red-200 text-red-800 rounded-lg p-2 text-xs" role="alert">
              {pcgError}
            </div>
          )}
        </div>

        {/* 2. Fichier FEC à vérifier (débloqué une fois le PCG chargé) */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <span className="mr-2 px-1.5 py-0.5 text-[11px] font-bold rounded bg-gray-700 text-white">2</span>
            📄 Fichier FEC à vérifier
          </label>
          <input
            ref={fecDnd.fileInputRef}
            type="file"
            accept=".txt,.csv,.fec"
            className="hidden"
            onChange={fecDnd.handlers.handleFileChange}
            aria-label="Sélectionner un fichier FEC"
          />
          <DropZone
            dragState={fecDnd.dragState}
            loading={fecLoading}
            onDragOver={fecDnd.handlers.handleDragOver}
            onDragLeave={fecDnd.handlers.handleDragLeave}
            onDrop={fecDnd.handlers.handleDrop}
            onClick={fecDnd.handlers.handleButtonClick}
            onKeyDown={(e) => fecDnd.handlers.handleKeyDown(e, fecDnd.handlers.handleButtonClick)}
            ariaLabel="Déposer ou sélectionner un fichier FEC"
            dataTestId="fec-dropzone"
          >
            <div className="py-4">
              <div className="text-3xl mb-2" aria-hidden="true">📄</div>
              {fecLoading ? (
                <p className="text-sm text-gray-600">Lecture en cours…</p>
              ) : fecFileName ? (
                <>
                  <p className="text-sm text-gray-700 font-medium">✓ {fecFileName}</p>
                  {report && !report.parseError && (
                    <p className="text-xs text-gray-500 mt-1">
                      Séparateur : <span className="font-medium text-gray-600">{report.delimiterLabel}</span>
                      {' · '}{report.stats.dataLines.toLocaleString('fr-FR')} lignes
                      {' · '}{report.stats.ecritureCount.toLocaleString('fr-FR')} écritures
                      {' · '}{report.stats.journalCount.toLocaleString('fr-FR')} journaux
                      {' · '}{report.header.length} colonnes
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-700 font-medium">Déposez le FEC ou cliquez</p>
                  <p className="text-xs text-gray-500 mt-1">.txt / .csv — séparateur tabulation ou « | »</p>
                </>
              )}
            </div>
          </DropZone>
          {fecError && (
            <div className="mt-2 bg-red-50 border border-red-200 text-red-800 rounded-lg p-2 text-xs" role="alert">
              {fecError}
            </div>
          )}
        </div>
      </div>

      {/* Source PCG utilisée */}
      <div className="mb-6 text-xs text-gray-500">
        Référentiel de comptes utilisé : <span className="font-medium text-gray-700">{pcgSourceLabel}</span>
      </div>

      {/* Rapport */}
      {report && (
        <div className="space-y-6">
          {report.parseError ? (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4" role="alert">
              <h3 className="font-semibold mb-1">Fichier illisible</h3>
              <p className="text-sm">{report.parseError}</p>
            </div>
          ) : (
            <>
              {/* Bandeau de synthèse */}
              {globalMeta && (
                <div className={`border-2 rounded-xl p-5 ${globalMeta.ring}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl" aria-hidden="true">{globalMeta.icon}</span>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{globalLabel[report.globalStatus]}</h2>
                      <p className="text-sm text-gray-600">
                        Séparateur détecté : {report.delimiterLabel}
                      </p>
                    </div>
                  </div>

                  {/* Statistiques */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5">
                    <Stat label="Lignes" value={report.stats.dataLines.toLocaleString('fr-FR')} />
                    <Stat label="Écritures" value={report.stats.ecritureCount.toLocaleString('fr-FR')} />
                    <Stat label="Journaux" value={report.stats.journalCount.toLocaleString('fr-FR')} />
                    <Stat label="Comptes" value={report.stats.accountCount.toLocaleString('fr-FR')} />
                    <Stat label="Total Débit" value={formatAmount(report.stats.totalDebit)} />
                    <Stat label="Total Crédit" value={formatAmount(report.stats.totalCredit)} />
                  </div>
                </div>
              )}

              {/* Liste des contrôles */}
              <div className="space-y-3">
                {report.checks.map(check => (
                  <CheckCard key={check.id} check={check} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-white/70 rounded-lg px-3 py-2 border border-black/5">
    <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
    <div className="text-sm font-semibold text-gray-900 font-mono">{value}</div>
  </div>
);
