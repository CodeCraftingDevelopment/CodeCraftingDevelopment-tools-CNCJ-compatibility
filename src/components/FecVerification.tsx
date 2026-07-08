import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Account, FileMetadata } from '../types/accounts';
import { DropZone } from './DropZone';
import { FileUploader } from './FileUploader';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import { formatFileSize } from '../utils/fileUtils';
import { validateFec, parseAccountCorrespondences, buildCorrectedFec, buildDecimalCorrectedFec, buildTrimmedFec, convertFecToSemicolon, FEC_CONTROLS, FecReport, FecCheck, CheckStatus } from '../utils/fecValidation';
import { FecStepsInfoModal } from './FecStepsInfoModal';
import { buildFecReportWorkbook } from '../utils/fecReportExcel';

interface FecVerificationProps {
  pcgAccounts: Account[]; // PCG déjà chargé en session (via « Integration PCG »), s'il existe
}

const STATUS_META: Record<CheckStatus, { icon: string; badge: string; ring: string }> = {
  ok: { icon: '✅', badge: 'bg-green-100 text-green-800', ring: 'border-green-200 bg-green-50' },
  warning: { icon: '⚠️', badge: 'bg-orange-100 text-orange-800', ring: 'border-orange-200 bg-orange-50' },
  error: { icon: '⛔', badge: 'bg-red-100 text-red-800', ring: 'border-red-200 bg-red-50' },
  skipped: { icon: '➖', badge: 'bg-gray-100 text-gray-600', ring: 'border-gray-200 bg-gray-50' }
};

const formatAmount = (n: number): string =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Carte blanche identique aux étapes du flux Integration PCG
const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-white shadow rounded-lg p-6 mb-6">{children}</div>
);

// Barre de progression : étape 0 = chargement, puis une étape par contrôle (rendu compact car nombreux).
const FecProgressBar: React.FC<{
  stepIndex: number;   // 0 = chargement ; 1..N = numéro du contrôle courant
  totalSteps: number;  // 1 (chargement) + N contrôles
  title: string;
  subtitle: string;
  onShowInfo?: () => void;
}> = ({ stepIndex, totalSteps, title, subtitle, onShowInfo }) => {
  return (
    <div className="mb-8 bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-700">Progression</h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">Étape {stepIndex + 1} / {totalSteps}</span>
          {onShowInfo && (
            <button
              type="button"
              onClick={onShowInfo}
              className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
              aria-label="Afficher l'aide sur les étapes"
            >
              ℹ️ Aide étapes
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center">
        {Array.from({ length: totalSteps }).map((_, i) => {
          const completed = i < stepIndex;
          const current = i === stepIndex;
          return (
            <React.Fragment key={i}>
              <div
                className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300
                  ${completed ? 'bg-green-500 text-white' : ''}
                  ${current ? 'bg-blue-600 text-white ring-4 ring-blue-200' : ''}
                  ${!completed && !current ? 'bg-gray-200 text-gray-500' : ''}`}
                aria-current={current ? 'step' : undefined}
                title={i === 0 ? 'Chargement des fichiers' : i === totalSteps - 1 ? 'Synthèse du rapport' : `Contrôle ${i} / ${totalSteps - 2}`}
              >
                {completed ? '✓' : i === 0 ? '📁' : i === totalSteps - 1 ? '📊' : i}
              </div>
              {i < totalSteps - 1 && (
                <div className={`flex-1 h-1 mx-1 rounded transition-all duration-300 ${i < stepIndex ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="mt-4 text-center">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      </div>
    </div>
  );
};

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

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-white/70 rounded-lg px-3 py-2 border border-black/5">
    <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
    <div className="text-sm font-semibold text-gray-900 font-mono">{value}</div>
  </div>
);

export const FecVerification: React.FC<FecVerificationProps> = ({ pcgAccounts }) => {
  // Plan comptable (réutilise le FileUploader du flux Integration PCG)
  const [pcgFileInfo, setPcgFileInfo] = useState<FileMetadata | null>(null);
  const [pcgLoadedAccounts, setPcgLoadedAccounts] = useState<Account[]>([]);
  const [pcgErrors, setPcgErrors] = useState<string[]>([]);

  // Table de correspondances (sortie de l'intégration PCG : code d'origine -> code final)
  const [correspondences, setCorrespondences] = useState<Map<string, string> | null>(null);
  const [corrInfo, setCorrInfo] = useState<{ name: string; count: number } | null>(null);
  const [corrError, setCorrError] = useState<string | null>(null);

  // Fichier FEC
  const [fecText, setFecText] = useState<string | null>(null);
  const [fecInfo, setFecInfo] = useState<{ name: string; size: string } | null>(null);
  const [fecLoading, setFecLoading] = useState(false);
  const [fecError, setFecError] = useState<string | null>(null);
  const [fecCorrected, setFecCorrected] = useState(false); // true si la correction devise a été appliquée en mémoire

  // PCG effectif : le fichier uploadé ici s'il existe, sinon celui de la session.
  // On transmet aussi le libellé (title ou rawData.name) pour l'afficher dans les suggestions.
  const effectivePcg = useMemo<Array<{ number: string; name?: string }>>(() => {
    const src = pcgLoadedAccounts.length > 0 ? pcgLoadedAccounts : pcgAccounts;
    return src.map(a => ({
      number: a.number,
      name: a.title ?? (typeof a.rawData?.name === 'string' ? a.rawData.name : undefined)
    }));
  }, [pcgLoadedAccounts, pcgAccounts]);

  // Le rapport se recalcule dès que le FEC, le PCG ou les correspondances changent
  const report = useMemo<FecReport | null>(
    () =>
      fecText !== null
        ? validateFec(fecText, fecInfo?.name ?? 'fec', effectivePcg, { correspondences: correspondences ?? undefined })
        : null,
    [fecText, fecInfo, effectivePcg, correspondences]
  );

  const handlePcgLoaded = useCallback((accounts: Account[], _source: string, fileInfo: FileMetadata) => {
    setPcgFileInfo(fileInfo);
    setPcgLoadedAccounts(accounts);
  }, []);
  const handlePcgCleared = useCallback(() => {
    setPcgFileInfo(null);
    setPcgLoadedAccounts([]);
    setPcgErrors([]);
  }, []);

  const handleFecFile = useCallback(async (file: File) => {
    setFecLoading(true);
    setFecError(null);
    setFecText(null);
    setFecCorrected(false);
    setFecInfo({ name: file.name, size: formatFileSize(file.size) });
    try {
      // Les FEC sont souvent encodés en ANSI/Windows-1252 (accents). On décode d'abord en UTF-8,
      // et on bascule sur Windows-1252 si le résultat contient des caractères de remplacement.
      const buffer = await file.arrayBuffer();
      let text = new TextDecoder('utf-8').decode(buffer);
      if (text.includes('�')) {
        text = new TextDecoder('windows-1252').decode(buffer);
      }
      setFecText(text);
    } catch (err) {
      setFecError(`Impossible de lire le fichier : ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setFecLoading(false);
    }
  }, []);

  const handleFecClear = useCallback(() => {
    setFecText(null);
    setFecInfo(null);
    setFecError(null);
    setFecCorrected(false);
  }, []);

  const handleCorrFile = useCallback(async (file: File) => {
    setCorrError(null);
    try {
      const text = await file.text();
      const map = parseAccountCorrespondences(text);
      if (map.size === 0) {
        setCorrError('Aucune correspondance détectée (colonnes attendues : original_client_code/final_code, ou accountingbridgeAccount/axelorAccount.code).');
        setCorrespondences(null);
        setCorrInfo(null);
      } else {
        setCorrespondences(map);
        setCorrInfo({ name: file.name, count: map.size });
      }
    } catch (err) {
      setCorrError(`Impossible de lire le fichier : ${err instanceof Error ? err.message : String(err)}`);
      setCorrespondences(null);
      setCorrInfo(null);
    }
  }, []);

  // Export du rapport complet (toutes les anomalies, sans le plafond d'affichage) au format Excel
  const handleExportReport = useCallback(() => {
    if (fecText === null) return;
    const fullReport = validateFec(fecText, fecInfo?.name ?? 'fec', effectivePcg, {
      maxIssues: Number.POSITIVE_INFINITY,
      correspondences: correspondences ?? undefined
    });
    const buffer = buildFecReportWorkbook(fullReport);
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const base = (fecInfo?.name ?? 'fec').replace(/\.[^./\\]+$/, '');
    const link = document.createElement('a');
    link.href = url;
    link.download = `rapport-fec-${base}.xlsx`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }, [fecText, fecInfo, effectivePcg, correspondences]);

  // Applique la correction devise EN MÉMOIRE (Idevise = EUR, Montantdevise = |Débit ou Crédit|).
  // Le rapport se recalcule automatiquement -> permet de re-contrôler que le fichier est conforme.
  const handleCorrectDevise = useCallback(() => {
    if (fecText === null) return;
    setFecText(buildCorrectedFec(fecText));
    setFecCorrected(true);
  }, [fecText]);

  // Corrige le séparateur décimal des montants EN MÉMOIRE (virgule -> point, sur Débit/Crédit/Montantdevise).
  // Requis pour l'import Axelor (BigDecimal). Le rapport se recalcule -> le contrôle repasse au vert.
  const handleCorrectDecimal = useCallback(() => {
    if (fecText === null) return;
    setFecText(buildDecimalCorrectedFec(fecText));
    setFecCorrected(true);
  }, [fecText]);

  // Convertit le séparateur de colonnes en « ; » EN MÉMOIRE (tabulation / « | » -> « ; »).
  const handleConvertColumnSeparator = useCallback(() => {
    if (fecText === null) return;
    setFecText(convertFecToSemicolon(fecText));
    setFecCorrected(true);
  }, [fecText]);

  // Détrime chaque colonne EN MÉMOIRE (retire les espaces de remplissage à largeur fixe).
  const handleTrimColumns = useCallback(() => {
    if (fecText === null) return;
    setFecText(buildTrimmedFec(fecText));
    setFecCorrected(true);
  }, [fecText]);

  // Télécharge le FEC actuellement en mémoire (corrigé si une correction a été appliquée)
  const handleDownloadFec = useCallback(() => {
    if (fecText === null) return;
    const blob = new Blob([fecText], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const name = fecInfo?.name ?? 'fec.txt';
    const ext = name.match(/\.[^./\\]+$/)?.[0] ?? '.txt';
    const base = name.replace(/\.[^./\\]+$/, '');
    const suffix = fecCorrected ? '-corrige' : '';
    const link = document.createElement('a');
    link.href = url;
    link.download = `${base}${suffix}${ext}`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }, [fecText, fecInfo, fecCorrected]);

  // Convertit le séparateur du FEC en « ; » (tabulation / « | » -> « ; ») et télécharge le fichier.
  // Part du FEC en mémoire : inclut la correction devise si elle a été appliquée au préalable.
  const handleDownloadFecSemicolon = useCallback(() => {
    if (fecText === null) return;
    const converted = convertFecToSemicolon(fecText);
    const blob = new Blob([converted], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const name = fecInfo?.name ?? 'fec.txt';
    const ext = name.match(/\.[^./\\]+$/)?.[0] ?? '.txt';
    const base = name.replace(/\.[^./\\]+$/, '');
    const suffix = fecCorrected ? '-corrige' : '';
    const link = document.createElement('a');
    link.href = url;
    link.download = `${base}${suffix}-separateur-pv${ext}`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }, [fecText, fecInfo, fecCorrected]);

  const corrDnd = useDragAndDrop({ onDrop: handleCorrFile, acceptedTypes: ['.csv'] });
  const fecDnd = useDragAndDrop({ onDrop: handleFecFile, acceptedTypes: [] });

  // Système d'étapes : 1 = chargement des fichiers, 2 = rapport de conformité
  const [step, setStep] = useState<'load' | 'report'>('load');
  const [showHelp, setShowHelp] = useState(false);
  // Parcours des contrôles un par un dans le rapport
  const [checkIndex, setCheckIndex] = useState(0);
  const reportReady = report !== null && !report.parseError;

  // Parcours à étapes FIXES : FEC_CONTROLS (toujours les mêmes contrôles, dans le même ordre).
  // Le contrôle courant = FEC_CONTROLS[checkIndex] ; son résultat est retrouvé dans le rapport par id.
  // Index max = FEC_CONTROLS.length (dernière étape = Synthèse)
  useEffect(() => {
    if (checkIndex > FEC_CONTROLS.length) setCheckIndex(FEC_CONTROLS.length);
  }, [checkIndex]);
  const isSummary = checkIndex >= FEC_CONTROLS.length; // dernière étape : synthèse + exports
  const currentControl = FEC_CONTROLS[checkIndex] ?? null;
  const currentCheck = currentControl ? (report?.checks.find(c => c.id === currentControl.id) ?? null) : null;

  // Revenir au chargement si le rapport n'est plus disponible (FEC retiré)
  useEffect(() => {
    if (step === 'report' && !reportReady) setStep('load');
  }, [step, reportReady]);

  const globalMeta = report ? STATUS_META[report.globalStatus] : null;
  const globalLabel: Record<CheckStatus, string> = {
    ok: 'Fichier conforme',
    warning: 'Conforme avec avertissements',
    error: 'Anomalies bloquantes détectées',
    skipped: '—'
  };

  // Barre de progression : Chargement (étape 0) + un contrôle par étape. Total FIXE (14), connu d'avance.
  const totalControls = FEC_CONTROLS.length;
  const topTotal = totalControls + 2; // Chargement + 13 contrôles + Synthèse
  const topStepIndex = step === 'load' ? 0 : checkIndex + 1;
  const topTitle = step === 'load'
    ? 'Chargement des fichiers'
    : isSummary
      ? 'Synthèse du rapport'
      : `Contrôle ${checkIndex + 1} / ${totalControls} — ${currentControl?.label ?? ''}`;
  const topSubtitle = step === 'load'
    ? 'FEC (obligatoire), PCG et table de correspondances (optionnels)'
    : isSummary
      ? 'Statut global, statistiques et exports'
      : currentCheck?.summary ?? 'En attente du chargement du FEC';

  const pcgSourceLabel =
    pcgLoadedAccounts.length > 0
      ? `Fichier déposé (${pcgLoadedAccounts.length} comptes)`
      : pcgAccounts.length > 0
      ? `PCG chargé en session (${pcgAccounts.length} comptes)`
      : 'Aucun — le contrôle de cohérence des comptes sera ignoré';

  // Statut de la carte fichier FEC (aligné sur le statut global du rapport)
  const fecStatus: CheckStatus = report ? (report.parseError ? 'error' : report.globalStatus) : 'skipped';
  const fecStatusMeta = STATUS_META[fecStatus];

  // Bandeau d'erreurs commun (même style que les erreurs d'import PCG)
  const bannerErrors = [...pcgErrors, ...(fecError ? [fecError] : [])];

  return (
    <>
      <FecProgressBar
        stepIndex={topStepIndex}
        totalSteps={topTotal}
        title={topTitle}
        subtitle={topSubtitle}
        onShowInfo={() => setShowHelp(true)}
      />

      {showHelp && <FecStepsInfoModal onClose={() => setShowHelp(false)} />}

      {step === 'load' && (
      <>
      {/* Bandeau d'erreurs commun (identique au flux Integration PCG) */}
      {bannerErrors.length > 0 && (
        <div className="mb-6 bg-orange-50 border border-orange-200 text-orange-800 rounded-lg p-4" role="alert">
          <h3 className="text-sm font-semibold mb-2">Problèmes de chargement</h3>
          <ul className="space-y-1 text-sm">
            {bannerErrors.map((error, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="mt-0.5 text-orange-500">•</span>
                <span>{error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 1. Fichier FEC à vérifier */}
      <Card>
        <label className="block text-sm font-medium text-gray-700 mb-2">📄 Fichier FEC à vérifier</label>
        <input
          ref={fecDnd.fileInputRef}
          type="file"
          accept=".txt,.csv,.fec"
          className="sr-only"
          onChange={fecDnd.handlers.handleFileChange}
          aria-label="Sélectionner un fichier FEC"
        />
        <DropZone
          dragState={fecDnd.dragState}
          loading={fecLoading}
          fileInfo={fecInfo ? { name: fecInfo.name, size: fecInfo.size, rowCount: report?.stats.dataLines ?? 0, loadStatus: fecStatus === 'skipped' ? 'success' : fecStatus === 'ok' ? 'success' : fecStatus } : null}
          onDragOver={fecDnd.handlers.handleDragOver}
          onDragLeave={fecDnd.handlers.handleDragLeave}
          onDrop={fecDnd.handlers.handleDrop}
          onClick={!fecInfo ? fecDnd.handlers.handleButtonClick : undefined}
          onKeyDown={(e) => fecDnd.handlers.handleKeyDown(e, !fecInfo ? fecDnd.handlers.handleButtonClick : undefined)}
          ariaLabel={!fecInfo ? 'Déposer ou sélectionner un fichier FEC' : `Fichier sélectionné : ${fecInfo.name}`}
          dataTestId="fec-dropzone"
        >
          {!fecInfo && !fecLoading && (
            <div className="space-y-2">
              <div className="mx-auto w-10 h-10 text-gray-400">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div className="text-sm text-gray-600">
                <p className="font-medium text-xs sm:text-sm">Glissez-déposez votre fichier FEC</p>
                <p className="text-xs">ou cliquez pour parcourir</p>
              </div>
            </div>
          )}

          {fecLoading && (
            <div className="space-y-2">
              <div className="mx-auto w-8 h-8 border-b-2 border-blue-600 rounded-full animate-spin"></div>
              <p className="text-sm text-blue-600">Lecture du fichier…</p>
            </div>
          )}

          {fecInfo && !fecLoading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${fecStatusMeta.badge}`} aria-hidden="true">
                    {fecStatusMeta.icon}
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{fecInfo.name}</p>
                    <p className="text-xs text-gray-500">
                      {fecInfo.size}
                      {report && !report.parseError && (
                        <>
                          {' • '}séparateur {report.delimiterLabel}
                          {' • '}{report.stats.dataLines.toLocaleString('fr-FR')} lignes
                          {' • '}{report.stats.ecritureCount.toLocaleString('fr-FR')} écritures
                          {' • '}{report.header.length} colonnes
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleFecClear}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Retirer le fichier FEC"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={fecDnd.handlers.handleButtonClick}
                  className="px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
                >
                  Changer le fichier
                </button>
              </div>
            </div>
          )}
        </DropZone>
        <p className="mt-2 text-xs text-gray-500 text-center">
          Format attendu : fichier FEC (norme A47 A-1) — 18 champs, séparateur tabulation ou « | »
        </p>
      </Card>

      {/* 2. Plan comptable (optionnel) — réutilise le FileUploader du flux PCG */}
      <Card>
        <FileUploader
          onFileLoaded={handlePcgLoaded}
          onFileCleared={handlePcgCleared}
          onError={setPcgErrors}
          label="📊 PCG avec CNCJ et comptes clients (optionnel)"
          source="general"
          fileInfo={pcgFileInfo}
          loadedAccounts={pcgLoadedAccounts}
        />
        <p className="text-xs text-gray-500">
          Référentiel utilisé pour le contrôle de cohérence des comptes :{' '}
          <span className="font-medium text-gray-700">{pcgSourceLabel}</span>
        </p>
      </Card>

      {/* 3. Table de correspondances (optionnel) */}
      <Card>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          🔗 Table de correspondances <span className="font-normal text-gray-400">(optionnel)</span>
        </label>
        <input
          ref={corrDnd.fileInputRef}
          type="file"
          accept=".csv"
          className="sr-only"
          onChange={corrDnd.handlers.handleFileChange}
          aria-label="Sélectionner la table de correspondances"
        />
        <DropZone
          dragState={corrDnd.dragState}
          fileInfo={corrInfo ? { name: corrInfo.name, size: '', rowCount: corrInfo.count, loadStatus: 'success' } : null}
          onDragOver={corrDnd.handlers.handleDragOver}
          onDragLeave={corrDnd.handlers.handleDragLeave}
          onDrop={corrDnd.handlers.handleDrop}
          onClick={!corrInfo ? corrDnd.handlers.handleButtonClick : undefined}
          onKeyDown={(e) => corrDnd.handlers.handleKeyDown(e, !corrInfo ? corrDnd.handlers.handleButtonClick : undefined)}
          ariaLabel="Déposer ou sélectionner la table de correspondances"
          dataTestId="corr-dropzone"
        >
          <div className="py-4">
            <div className="text-3xl mb-2" aria-hidden="true">🔗</div>
            {corrInfo ? (
              <p className="text-sm text-gray-700 font-medium">✓ {corrInfo.name} — {corrInfo.count} correspondances</p>
            ) : (
              <>
                <p className="text-sm text-gray-700 font-medium">Déposez la table de correspondances ou cliquez</p>
                <p className="text-xs text-gray-500 mt-1">accounting-bridge-account-mapping.csv ou correspondances-comptes.csv (code d'origine → code final)</p>
              </>
            )}
          </div>
        </DropZone>
        {corrInfo && (
          <div className="flex justify-center mt-2">
            <button
              type="button"
              onClick={corrDnd.handlers.handleButtonClick}
              className="px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
            >
              Changer le fichier
            </button>
          </div>
        )}
        {corrError && (
          <div className="mt-2 bg-red-50 border border-red-200 text-red-800 rounded-lg p-2 text-xs" role="alert">
            {corrError}
          </div>
        )}
        <p className="mt-2 text-xs text-gray-500">
          Les comptes du FEC déjà mappés vers le PCG (via l'intégration) ne seront pas signalés comme absents.
        </p>
      </Card>

      {/* Passage au rapport */}
      <div className="flex justify-end">
        <button
          type="button"
          disabled={!reportReady}
          onClick={() => { setCheckIndex(0); setStep('report'); }}
          className={`px-6 py-2 rounded-lg font-medium text-white transition-colors flex items-center gap-2 ${
            reportReady ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          Suivant <span aria-hidden="true">→</span>
        </button>
      </div>
      </>
      )}

      {step === 'report' && (
      <>
      {/* Retour au chargement */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setStep('load')}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
        >
          ← Modifier les fichiers
        </button>
      </div>

      {/* Rapport */}
      {report && (
        <Card>
          {report.parseError ? (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4" role="alert">
              <h3 className="font-semibold mb-1">Fichier illisible</h3>
              <p className="text-sm">{report.parseError}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {isSummary && globalMeta && (
                <div className={`border-2 rounded-xl p-5 ${globalMeta.ring}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl" aria-hidden="true">{globalMeta.icon}</span>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">{globalLabel[report.globalStatus]}</h2>
                        <p className="text-sm text-gray-600">Séparateur détecté : {report.delimiterLabel}</p>
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-col sm:flex-row gap-2">
                      {fecCorrected && (
                        <button
                          type="button"
                          onClick={handleDownloadFec}
                          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                        >
                          <span aria-hidden="true">⬇️</span>
                          Télécharger le FEC corrigé
                        </button>
                      )}
                      {report.delimiter && report.delimiter !== ';' && (
                        <button
                          type="button"
                          onClick={handleDownloadFecSemicolon}
                          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                        >
                          <span aria-hidden="true">⬇️</span>
                          Télécharger le FEC (séparateur «&nbsp;;&nbsp;»)
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleExportReport}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        <span aria-hidden="true">⬇️</span>
                        Exporter le rapport (Excel)
                      </button>
                    </div>
                  </div>

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

              {/* Contrôle courant (étapes 2..14) — masqué sur l'étape Synthèse */}
              {!isSummary && (
                <div className="space-y-4">
                  {currentCheck && <CheckCard key={currentCheck.id} check={currentCheck} />}

                  {/* Correction en mémoire proposée selon le contrôle courant */}
                  {currentCheck?.id === 'coherence-devise' && currentCheck.status !== 'ok' && (
                    <button type="button" onClick={handleCorrectDevise} className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors inline-flex items-center gap-2">
                      <span aria-hidden="true">🛠️</span> Corriger Idevise / Montantdevise (en mémoire)
                    </button>
                  )}
                  {currentCheck?.id === 'format-separateur-decimal' && currentCheck.status !== 'ok' && (
                    <button type="button" onClick={handleCorrectDecimal} className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors inline-flex items-center gap-2">
                      <span aria-hidden="true">🛠️</span> Corriger le séparateur décimal — virgule → point (en mémoire)
                    </button>
                  )}
                  {currentCheck?.id === 'format-separateur-colonnes' && currentCheck.status !== 'ok' && (
                    <button type="button" onClick={handleConvertColumnSeparator} className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors inline-flex items-center gap-2">
                      <span aria-hidden="true">🛠️</span> Convertir le séparateur de colonnes en «&nbsp;;&nbsp;» (en mémoire)
                    </button>
                  )}
                  {currentCheck?.id === 'format-espaces' && currentCheck.status !== 'ok' && (
                    <button type="button" onClick={handleTrimColumns} className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors inline-flex items-center gap-2">
                      <span aria-hidden="true">🛠️</span> Détrimer chaque colonne (retirer les espaces) — en mémoire
                    </button>
                  )}
                </div>
              )}

              {/* Navigation : contrôles puis Synthèse (dernière étape) */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <button
                  type="button"
                  disabled={checkIndex === 0}
                  onClick={() => setCheckIndex(i => Math.max(0, i - 1))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${checkIndex === 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-500 text-white hover:bg-gray-600'}`}
                >
                  ← Précédent
                </button>
                <button
                  type="button"
                  disabled={checkIndex >= totalControls}
                  onClick={() => setCheckIndex(i => Math.min(totalControls, i + 1))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${checkIndex >= totalControls ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                  {checkIndex === totalControls - 1 ? 'Voir la synthèse →' : 'Suivant →'}
                </button>
              </div>
            </div>
          )}
        </Card>
      )}
      </>
      )}
    </>
  );
};
