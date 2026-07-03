import React, { useCallback, useMemo, useState } from 'react';
import { FileMetadata, Account } from '../types/accounts';
import { parseSvvCorrespondences } from '../utils/accountUtils';
import { normalizeForDisplay } from '../utils/accountMatchingUtils';
import { formatFileSize, validateFileSize } from '../utils/fileUtils';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import { DropZone } from './DropZone';

interface SvvUploaderProps {
  fileInfo: FileMetadata | null;
  correspondences: { [compteEncheres: string]: string };
  generalAccounts: Account[];
  disabled?: boolean;
  onLoaded: (correspondences: { [compteEncheres: string]: string }, fileInfo: FileMetadata) => void;
  onCleared: () => void;
}

export const SvvUploader: React.FC<SvvUploaderProps> = ({
  fileInfo,
  correspondences,
  generalAccounts,
  disabled = false,
  onLoaded,
  onCleared
}) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  // Mode d'aperçu : toutes les correspondances, ou seulement les cibles absentes du PCG
  const [previewMode, setPreviewMode] = useState<'all' | 'missing'>('all');
  // Fichier SVV optionnel : les problèmes sont affichés localement et ne bloquent JAMAIS le flux.
  const [localMessage, setLocalMessage] = useState<string>('');

  // Codes existants dans le fichier PCG (comptes PCG + CNCJ), pour vérifier les cibles SVV
  const pcgCodes = useMemo(
    () => new Set(generalAccounts.map(a => normalizeForDisplay(a.number))),
    [generalAccounts]
  );
  // Correspondances dont la cible (2e colonne) n'existe PAS dans le PCG chargé
  const missingTargets = useMemo(
    () => Object.entries(correspondences).filter(([, target]) => !pcgCodes.has(normalizeForDisplay(target))),
    [correspondences, pcgCodes]
  );
  const pcgLoaded = generalAccounts.length > 0;

  const processFile = useCallback(async (file: File) => {
    setLocalMessage('');

    const sizeValidation = validateFileSize(file);
    if (!sizeValidation.isValid) {
      setLocalMessage(sizeValidation.error || 'Fichier invalide');
      return;
    }
    if (!file.name.endsWith('.csv')) {
      setLocalMessage('Veuillez sélectionner un fichier CSV');
      return;
    }

    onLoaded({}, {
      name: file.name,
      size: formatFileSize(file.size),
      rowCount: 0,
      loadStatus: 'loading'
    });

    try {
      const { correspondences: parsed, count, errors } = await parseSvvCorrespondences(file);

      if (count === 0) {
        setLocalMessage(['Aucune correspondance SVV valide trouvée dans le fichier.', ...errors].join(' '));
        onLoaded({}, {
          name: file.name,
          size: formatFileSize(file.size),
          rowCount: 0,
          loadStatus: 'error'
        });
        return;
      }

      if (errors.length > 0) {
        setLocalMessage(`${errors.length} ligne(s) ignorée(s).`);
      }

      onLoaded(parsed, {
        name: file.name,
        size: formatFileSize(file.size),
        rowCount: count,
        loadStatus: errors.length > 0 ? 'warning' : 'success'
      });
    } catch (error) {
      setLocalMessage(`Erreur lors de la lecture du fichier SVV : ${error}`);
      onLoaded({}, {
        name: file.name,
        size: formatFileSize(file.size),
        rowCount: 0,
        loadStatus: 'error'
      });
    }
  }, [onLoaded]);

  // L'import SVV n'est possible que si le PCG (avec CNCJ) est chargé (référence des cibles)
  const effectiveDisabled = disabled || !pcgLoaded;

  const { dragState, fileInputRef, handlers } = useDragAndDrop({
    disabled: effectiveDisabled,
    onDrop: processFile,
    acceptedTypes: ['.csv']
  });

  const entries = Object.entries(correspondences);
  const previewEntries = previewMode === 'missing' ? missingTargets : entries;

  return (
    <div className="mb-4 w-full" data-testid="file-uploader-svv">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2">
        <label className="block text-sm font-medium text-gray-700">
          🔁 Correspondances SVV (mappage pré-validé, optionnel)
        </label>
      </div>

      <DropZone
        dragState={dragState}
        disabled={effectiveDisabled}
        loading={fileInfo?.loadStatus === 'loading'}
        fileInfo={fileInfo}
        onDragOver={handlers.handleDragOver}
        onDragLeave={handlers.handleDragLeave}
        onDrop={handlers.handleDrop}
        onClick={!fileInfo ? handlers.handleButtonClick : undefined}
        onKeyDown={(e) => handlers.handleKeyDown(e, !fileInfo ? handlers.handleButtonClick : undefined)}
        ariaLabel={!fileInfo ? 'Zone de dépôt pour les correspondances SVV' : `Fichier SVV : ${fileInfo?.name}`}
        dataTestId="dropzone-svv"
        uploadState={fileInfo?.loadStatus || 'idle'}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handlers.handleFileChange}
          disabled={effectiveDisabled || fileInfo?.loadStatus === 'loading'}
          className="sr-only"
          data-testid="file-input-svv"
        />

        {!fileInfo && (
          <div className="space-y-2">
            <div className="mx-auto w-10 h-10 text-gray-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div className="text-sm text-gray-600">
              {pcgLoaded ? (
                <>
                  <p className="font-medium text-xs sm:text-sm">Glissez-déposez le fichier de correspondances SVV</p>
                  <p className="text-xs">ou cliquez pour parcourir</p>
                </>
              ) : (
                <p className="font-medium text-xs sm:text-sm text-gray-500">Chargez d'abord le fichier « PCG avec CNCJ » pour activer cet import</p>
              )}
            </div>
          </div>
        )}

        {fileInfo?.loadStatus === 'loading' && (
          <div className="space-y-2">
            <div className="mx-auto w-8 h-8 border-b-2 border-blue-600 rounded-full animate-spin"></div>
            <p className="text-sm text-blue-600">Chargement du fichier...</p>
          </div>
        )}

        {fileInfo && (fileInfo.loadStatus === 'success' || fileInfo.loadStatus === 'warning' || fileInfo.loadStatus === 'error') && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  fileInfo.loadStatus === 'success' ? 'bg-green-100 text-green-600' :
                  fileInfo.loadStatus === 'warning' ? 'bg-orange-100 text-orange-600' :
                  'bg-red-100 text-red-600'
                }`}>
                  {fileInfo.loadStatus === 'error' ? '✕' : '✓'}
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{fileInfo?.name}</p>
                  <p className="text-xs text-gray-500">
                    {fileInfo?.size}
                    {fileInfo.rowCount > 0 && ` • ${fileInfo.rowCount} correspondance${fileInfo.rowCount > 1 ? 's' : ''}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setLocalMessage(''); onCleared(); }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                data-testid="clear-file-svv"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className={`text-sm ${
              fileInfo.loadStatus === 'success' ? 'text-green-600' :
              fileInfo.loadStatus === 'warning' ? 'text-orange-600' :
              'text-red-600'
            }`}>
              {fileInfo.loadStatus === 'error'
                ? 'Échec du chargement'
                : `${fileInfo.rowCount} correspondance${fileInfo.rowCount > 1 ? 's' : ''} SVV chargée${fileInfo.rowCount > 1 ? 's' : ''}`}
            </div>

            {/* Vérification : la cible (2e colonne) doit exister dans le fichier PCG */}
            {entries.length > 0 && (
              !pcgLoaded ? (
                <div className="text-xs text-gray-500 text-center">Chargez le fichier PCG pour vérifier l'existence des cibles.</div>
              ) : missingTargets.length > 0 ? (
                <button
                  type="button"
                  onClick={() => { setPreviewMode('missing'); setIsPreviewOpen(true); }}
                  className="block w-full text-center text-sm text-orange-700 font-medium hover:text-orange-900 underline decoration-dotted underline-offset-2"
                >
                  ⚠️ {missingTargets.length} cible{missingTargets.length > 1 ? 's' : ''} absente{missingTargets.length > 1 ? 's' : ''} du PCG — 👁 Consulter
                </button>
              ) : (
                <div className="text-sm text-green-600 text-center">✓ Toutes les cibles existent dans le PCG</div>
              )
            )}

            {entries.length > 0 && (
              <div className="flex justify-center space-x-2">
                <button
                  type="button"
                  onClick={() => { setPreviewMode('all'); setIsPreviewOpen(true); }}
                  className="px-3 py-1 text-xs bg-green-50 text-green-700 rounded-full hover:bg-green-100 transition-colors"
                >
                  Consulter les correspondances
                </button>
                <button
                  type="button"
                  onClick={handlers.handleButtonClick}
                  className="px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
                >
                  Changer le fichier
                </button>
              </div>
            )}
          </div>
        )}
      </DropZone>

      {localMessage && (
        <p className="mt-2 text-xs text-orange-600 text-center">{localMessage}</p>
      )}

      <p className="mt-2 text-xs text-gray-500 text-center">
        Optionnel — Format CSV attendu : deux colonnes « Compte Enchères (8 chiffres) ; Correspondance (7 chiffres) ». Appliqué en priorité à la standardisation.
      </p>

      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {previewMode === 'missing' ? '⚠️ Cibles SVV absentes du PCG' : 'Correspondances SVV'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {previewMode === 'missing'
                    ? `${previewEntries.length} cible${previewEntries.length > 1 ? 's' : ''} sans compte correspondant dans le PCG`
                    : (
                      <>
                        {entries.length} correspondance{entries.length > 1 ? 's' : ''}
                        {pcgLoaded && missingTargets.length > 0 && (
                          <span className="text-orange-600"> · {missingTargets.length} cible{missingTargets.length > 1 ? 's' : ''} absente{missingTargets.length > 1 ? 's' : ''} du PCG</span>
                        )}
                      </>
                    )}
                </p>
              </div>
              <button onClick={() => setIsPreviewOpen(false)} className="text-gray-400 hover:text-gray-600" aria-label="Fermer">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Compte Enchères</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Correspondance</th>
                    {pcgLoaded && <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Dans le PCG</th>}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {previewEntries.map(([source, target]) => {
                    const inPcg = pcgCodes.has(normalizeForDisplay(target));
                    return (
                      <tr key={source} className={pcgLoaded && !inPcg ? 'bg-orange-50' : 'hover:bg-gray-50'}>
                        <td className="px-4 py-2 font-mono text-gray-600">{source}</td>
                        <td className={`px-4 py-2 font-mono ${pcgLoaded && !inPcg ? 'text-orange-700 font-semibold' : 'text-gray-900'}`}>{target}</td>
                        {pcgLoaded && (
                          <td className="px-4 py-2 text-xs">
                            {inPcg
                              ? <span className="text-green-600">✓ présent</span>
                              : <span className="text-orange-700 font-semibold">✗ absent</span>}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
