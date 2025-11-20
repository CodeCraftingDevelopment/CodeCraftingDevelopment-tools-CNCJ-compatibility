import React from 'react';
import { Account, ProcessingResult } from '../types/accounts';
import { StepStatsGrid, StepStat, StepLegend } from './components/StepContent';

interface StepFinalSummaryProps {
  clientAccounts: Account[];
  result: ProcessingResult | null;
  cncjConflictResult: ProcessingResult | null;
  replacementCodes: { [key: string]: string };
  cncjConflictCorrections: { [key: string]: string | 'error' };
  mergedClientAccounts: Account[];
  finalFilter: 'all' | 'step4' | 'step6' | 'step4+step6';
  onFilterChange: (filter: 'all' | 'step4' | 'step6' | 'step4+step6') => void;
}

export const StepFinalSummary: React.FC<StepFinalSummaryProps> = ({
  clientAccounts,
  result,
  cncjConflictResult,
  replacementCodes,
  cncjConflictCorrections,
  mergedClientAccounts,
  finalFilter,
  onFilterChange
}) => {
  // Calculer les données du récapitulatif
  const step4Ids = new Set(result?.duplicates?.map(d => d.id) || []);
  const step6Ids = new Set(cncjConflictResult?.duplicates?.map(d => d.id) || []);
  
  const finalSummaryData = clientAccounts.map(account => {
    const mergedAccount = mergedClientAccounts.find(m => m.id === account.id);
    const correctedByCncj = cncjConflictCorrections[account.id];
    
    const isStep4Duplicate = step4Ids.has(account.id);
    const isStep6Conflict = step6Ids.has(account.id);
    
    let modificationSource = null;
    if (isStep4Duplicate && isStep6Conflict) {
      modificationSource = 'step4+step6';
    } else if (isStep6Conflict) {
      modificationSource = 'step6';
    } else if (isStep4Duplicate) {
      modificationSource = 'step4';
    }
    
    const correctedCode = isStep4Duplicate 
      ? (mergedAccount?.number || account.number)
      : account.number;
    
    return {
      id: account.id,
      title: account.title || 'Sans titre',
      originalCode: account.number,
      correctedCode: correctedCode,
      cncjCorrection: correctedByCncj === 'error' ? 'Erreur' : (correctedByCncj || '-'),
      wasModified: replacementCodes[account.id] !== undefined,
      modificationSource,
      isStep4Duplicate,
      isStep6Conflict
    };
  });

  const modifiedCount = finalSummaryData.filter(row => row.wasModified).length;
  const step4Count = finalSummaryData.filter(row => row.isStep4Duplicate).length;
  const step6Count = finalSummaryData.filter(row => row.isStep6Conflict).length;
  const doubleModifiedCount = finalSummaryData.filter(row => row.modificationSource === 'step4+step6').length;
  const totalCount = finalSummaryData.length;

  const getRowStyle = (source: string | null) => {
    switch (source) {
      case 'step4': return 'bg-blue-50 border-l-4 border-blue-400';
      case 'step6': return 'bg-orange-50 border-l-4 border-orange-400';
      case 'step4+step6': return 'bg-purple-50 border-l-4 border-purple-400';
      default: return '';
    }
  };

  const filteredData = finalSummaryData.filter(row => {
    if (finalFilter === 'all') return true;
    return row.modificationSource === finalFilter;
  });

  const handleExport = () => {
    const csvHeaders = ['account_title', 'original_client_code', 'final_code'];
    
    const csvRows = filteredData.map(row => {
      let finalCode;
      if (row.modificationSource === 'step4+step6') {
        finalCode = row.cncjCorrection === 'Erreur' ? row.correctedCode : row.cncjCorrection;
      } else if (row.modificationSource === 'step4') {
        finalCode = row.correctedCode;
      } else if (row.modificationSource === 'step6') {
        finalCode = row.cncjCorrection === 'Erreur' ? row.originalCode : row.cncjCorrection;
      } else {
        finalCode = row.originalCode;
      }
      
      return [row.title, row.originalCode, finalCode];
    });
    
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'correspondances-comptes.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Statistiques */}
      <StepStatsGrid columns={5}>
        <StepStat value={totalCount} label="Total comptes" color="blue" />
        <StepStat value={modifiedCount} label="Comptes modifiés" color="green" />
        <StepStat value={step4Count} label="Correction doublons" color="blue" />
        <StepStat value={step6Count} label="Corrections CNCJ" color="orange" />
        <StepStat value={doubleModifiedCount} label="Double modification" color="purple" />
      </StepStatsGrid>

      {/* Légende */}
      <StepLegend
        items={[
          { color: 'bg-blue-50 border-l-4 border-blue-400', label: 'Correction doublons' },
          { color: 'bg-orange-50 border-l-4 border-orange-400', label: 'Corrections CNCJ' },
          { color: 'bg-purple-50 border-l-4 border-purple-400', label: 'Double modification' }
        ]}
      />

      {/* Boutons de filtrage */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex justify-center space-x-2 flex-wrap">
          <button
            onClick={() => onFilterChange('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              finalFilter === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Tous ({totalCount})
          </button>
          <button
            onClick={() => onFilterChange('step4')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              finalFilter === 'step4' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Doublons corrigés ({step4Count})
          </button>
          <button
            onClick={() => onFilterChange('step6')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              finalFilter === 'step6' 
                ? 'bg-orange-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Corrections CNCJ ({step6Count})
          </button>
          <button
            onClick={() => onFilterChange('step4+step6')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              finalFilter === 'step4+step6' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Double modification ({doubleModifiedCount})
          </button>
        </div>
      </div>

      {/* Tableau récapitulatif */}
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2 text-left">Titre</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Code original</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Code corrigé (Client)</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Code corrigé (CNCJ)</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Code final</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row) => {
              let finalCode;
              let finalCodeColor = 'text-gray-700';
              
              if (row.modificationSource === 'step4+step6') {
                finalCode = row.cncjCorrection === 'Erreur' ? row.correctedCode : row.cncjCorrection;
                finalCodeColor = 'text-purple-700 font-bold';
              } else if (row.modificationSource === 'step4') {
                finalCode = row.correctedCode;
                finalCodeColor = 'text-blue-700 font-bold';
              } else if (row.modificationSource === 'step6') {
                finalCode = row.cncjCorrection === 'Erreur' ? row.originalCode : row.cncjCorrection;
                finalCodeColor = 'text-orange-700 font-bold';
              } else {
                finalCode = row.originalCode;
              }

              return (
                <tr key={row.id} className={getRowStyle(row.modificationSource)}>
                  <td className="border border-gray-300 px-4 py-2">{row.title}</td>
                  <td className="border border-gray-300 px-4 py-2 font-mono">{row.originalCode}</td>
                  <td className="border border-gray-300 px-4 py-2 font-mono">
                    {row.correctedCode === row.originalCode ? '-' : row.correctedCode}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 font-mono">{row.cncjCorrection}</td>
                  <td className="border border-gray-300 px-4 py-2 font-mono">
                    <span className={finalCodeColor}>{finalCode}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bouton d'export */}
      <div className="mt-6 text-center">
        <button
          onClick={handleExport}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          📥 Exporter les correspondances
        </button>
      </div>
    </div>
  );
};
