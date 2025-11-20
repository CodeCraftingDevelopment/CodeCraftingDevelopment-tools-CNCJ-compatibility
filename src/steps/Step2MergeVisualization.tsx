import React from 'react';
import { MergeInfo } from '../types/accounts';
import { StepStat, StepInfoBox, StepEmptyState } from './components/StepContent';

interface Step2MergeVisualizationProps {
  mergeInfo: MergeInfo[];
}

export const Step2MergeVisualization: React.FC<Step2MergeVisualizationProps> = ({
  mergeInfo
}) => {
  if (mergeInfo.length === 0) {
    return (
      <StepEmptyState
        icon="✅"
        title="Aucune fusion nécessaire"
        description="Tous les comptes sont uniques (même numéro ET titre)"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Statistique */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="text-center">
          <StepStat
            value={mergeInfo.length}
            label={`fusion${mergeInfo.length > 1 ? 's' : ''} automatique${mergeInfo.length > 1 ? 's' : ''}`}
            color="blue"
          />
        </div>
      </div>
      
      {/* Tableau des fusions */}
      <div className="overflow-x-auto max-h-64 overflow-y-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2 text-left">Numéro</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Titre</th>
              <th className="border border-gray-300 px-4 py-2 text-center">Nombre fusionné</th>
            </tr>
          </thead>
          <tbody>
            {mergeInfo.map((info, index) => (
              <tr key={index} className="bg-blue-50">
                <td className="border border-gray-300 px-4 py-2 font-mono">{info.number}</td>
                <td className="border border-gray-300 px-4 py-2">{info.title || 'Sans titre'}</td>
                <td className="border border-gray-300 px-4 py-2 text-center font-bold text-blue-600">
                  {info.mergedCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Information */}
      <StepInfoBox variant="info">
        <p className="text-sm text-center">
          💡 Les comptes ayant le même numéro ET le même titre ont été automatiquement fusionnés pour éviter les doublons.
        </p>
      </StepInfoBox>
    </div>
  );
};
