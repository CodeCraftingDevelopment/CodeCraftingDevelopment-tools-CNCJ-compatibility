import React, { useMemo } from 'react';
import { InvalidRow } from '../types/accounts';

interface ImportErrorsModalProps {
  invalidRows: InvalidRow[];
  genericErrors: string[];
  fileName: string;
  onClose: () => void;
}

export const ImportErrorsModal: React.FC<ImportErrorsModalProps> = ({
  invalidRows,
  genericErrors,
  fileName,
  onClose
}) => {
  const hasInvalidRows = invalidRows.length > 0;
  const hasGenericErrors = genericErrors.length > 0;

  const csvContent = useMemo(() => {
    if (!hasInvalidRows) {
      return '';
    }

    const header = ['Ligne', 'Raison', 'Valeurs'];
    const rows = invalidRows.map((row) => [
      row.lineNumber.toString(),
      row.reason.replace(/\n/g, ' '),
      row.values.join(' | ')
    ]);

    const allRows = [header, ...rows];
    return allRows
      .map((cells) => cells.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
  }, [hasInvalidRows, invalidRows]);

  const handleExport = () => {
    if (!csvContent) {
      return;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const exportName = fileName ? fileName.replace(/\.csv$/i, '') : 'import';
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.href = url;
    link.download = `${exportName}_lignes_invalides.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-errors-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 id="import-errors-title" className="text-lg font-semibold text-gray-900">
            Détails des lignes ignorées
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Fermer la fenêtre d'information"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto space-y-4">
          {hasInvalidRows && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-800">
                  {invalidRows.length} ligne{invalidRows.length > 1 ? 's' : ''} non importée{invalidRows.length > 1 ? 's' : ''}
                </h3>
                <button
                  type="button"
                  onClick={handleExport}
                  className="px-3 py-1.5 text-xs bg-orange-100 text-orange-700 rounded-full hover:bg-orange-200 transition-colors"
                >
                  Exporter en CSV
                </button>
              </div>
              <table className="min-w-full text-sm border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-700 border-b">Ligne</th>
                    <th className="px-3 py-2 text-left text-gray-700 border-b">Raison</th>
                    <th className="px-3 py-2 text-left text-gray-700 border-b">Valeurs du fichier</th>
                  </tr>
                </thead>
                <tbody>
                  {invalidRows.map((row) => (
                    <tr key={row.lineNumber} className="odd:bg-white even:bg-gray-50">
                      <td className="px-3 py-2 border-b align-top font-mono text-xs text-gray-600">{row.lineNumber}</td>
                      <td className="px-3 py-2 border-b text-gray-800">{row.reason}</td>
                      <td className="px-3 py-2 border-b text-gray-600">
                        {row.values.length > 0 ? row.values.join(' | ') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {hasGenericErrors && (
            <div className="bg-orange-50 border border-orange-200 text-orange-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-2">Autres messages</h3>
              <ul className="space-y-1 text-sm">
                {genericErrors.map((error, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="mt-0.5 text-orange-500">•</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!hasInvalidRows && !hasGenericErrors && (
            <p className="text-sm text-gray-600">
              Aucune information supplémentaire disponible pour cet import.
            </p>
          )}
        </div>

        <div className="border-t px-6 py-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};