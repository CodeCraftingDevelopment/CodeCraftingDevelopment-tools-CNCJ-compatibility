import React, { useState, useMemo } from 'react';
import { Account } from '../types/accounts';
import { StepStatsGrid, StepStat, StepEmptyState } from './components/StepContent';

interface MetadataRow {
  id: string;
  title: string;
  finalCode: string;
  inheritedData: Record<string, any>;
  isInherited: boolean;
  hasClosestMatch: boolean; // true si la recherche a abouti, false sinon
  isInPcg: boolean; // pour le filtrage correct
}

interface Step7MetadataCompletionProps {
  clientAccounts: Account[];
  mergedClientAccounts: Account[];
  generalAccounts: Account[];
  replacementCodes: { [key: string]: string };
  cncjReplacementCodes: { [key: string]: string };
  onMetadataChange: (accountId: string, metadata: Record<string, any>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export const Step7MetadataCompletion: React.FC<Step7MetadataCompletionProps> = ({
  clientAccounts,
  generalAccounts,
  replacementCodes,
  cncjReplacementCodes,
  onMetadataChange,
  onNext,
  onPrevious
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // Normaliser un code à 7 chiffres pour l'affichage
  const normalizeForDisplay = (code: string): string => {
    if (!code || code === '-' || code === 'Erreur') return code;
    return code.length > 7 ? code.slice(0, 7) : code.padEnd(7, '0');
  };

  // Calculer le code final pour un compte
  const computeFinalCode = (account: Account): string => {
    const step4Ids = new Set(); // Serait passé en prop si nécessaire
    const step6Ids = new Set(); // Serait passé en prop si nécessaire
    
    const isStep4Duplicate = step4Ids.has(account.id);
    const isStep6Conflict = step6Ids.has(account.id);
    
    // Logique simplifiée pour calculer le code final
    if (isStep6Conflict && cncjReplacementCodes[account.id]) {
      return cncjReplacementCodes[account.id];
    }
    if (isStep4Duplicate && replacementCodes[account.id]) {
      return replacementCodes[account.id];
    }
    return account.number;
  };

  // Identifier les comptes qui ne sont PAS dans PCG et qui ont besoin de métadonnées
  const metadataData: MetadataRow[] = useMemo(() => {
    // Créer un lookup des comptes PCG
    const pcgLookup = new Map<string, Account>();
    generalAccounts.forEach(account => {
      pcgLookup.set(account.number, account);
    });

    // Pré-grouper les comptes PCG par préfixe pour l'héritage intelligent
    const pcgAccountsByPrefix = new Map<string, Account[]>();
    generalAccounts.forEach(account => {
      const codeNum = parseInt(account.number);
      if (!isNaN(codeNum) && account.number.length >= 4) {
        const prefix = account.number.substring(0, 4);
        if (!pcgAccountsByPrefix.has(prefix)) {
          pcgAccountsByPrefix.set(prefix, []);
        }
        pcgAccountsByPrefix.get(prefix)?.push(account);
      }
    });

    return clientAccounts.map(account => {
      const finalCode = normalizeForDisplay(computeFinalCode(account));
      const isInPcg = pcgLookup.has(finalCode);
      
      let inheritedData: Record<string, any> = {};
      let isInherited = false;
      let matchingPcgAccounts: Account[] = [];

      if (!isInPcg && finalCode.length >= 4) {
        const prefix = finalCode.substring(0, 4);
        const codeNum = parseInt(finalCode);
        
        if (!isNaN(codeNum)) {
          matchingPcgAccounts = pcgAccountsByPrefix.get(prefix) || [];
          
          if (matchingPcgAccounts.length > 0) {
            const closestPcgAccount = matchingPcgAccounts.reduce((closest, current) => {
              const currentDiff = Math.abs(codeNum - parseInt(current.number));
              const closestDiff = Math.abs(codeNum - parseInt(closest.number));
              return currentDiff < closestDiff ? current : closest;
            });
            
            inheritedData = {...(closestPcgAccount.rawData || {})};
            delete inheritedData.importId;
            delete inheritedData.code;
            delete inheritedData.name;
            isInherited = true;
          }
        }
      }

      return {
        id: account.id,
        title: account.title || 'Sans titre',
        finalCode,
        inheritedData,
        isInherited: !isInPcg && isInherited,
        hasClosestMatch: !isInPcg && isInherited && matchingPcgAccounts.length > 0,
        isInPcg
      };
    });
  }, [clientAccounts, generalAccounts, replacementCodes, cncjReplacementCodes]);

  // Comptes qui nécessitent une attention (non présents dans PCG)
  const accountsNeedingMetadata = metadataData.filter(row => !row.isInPcg);
  const accountsWithClosestMatch = accountsNeedingMetadata.filter(row => row.hasClosestMatch);
  const accountsWithoutClosestMatch = accountsNeedingMetadata.filter(row => !row.hasClosestMatch);
  const totalCount = metadataData.length;
  const needingMetadataCount = accountsNeedingMetadata.length;

  const filteredData = selectedAccountId 
    ? metadataData.filter(row => row.id === selectedAccountId)
    : accountsNeedingMetadata;

  // Champs de métadonnées importants à afficher/éditer
  const metadataFields = [
    { key: 'parent_code', label: 'Code parent', type: 'text' },
    { key: 'accountType.importId', label: 'Type de compte', type: 'text' },
    { key: 'isRegulatoryAccount', label: 'Compte réglementaire', type: 'select', options: ['true', 'false'] },
    { key: 'commonPosition', label: 'Position commune', type: 'text' },
    { key: 'reconcileOk', label: 'Lettrage OK', type: 'text' },
    { key: 'compatibleAccounts', label: 'Comptes compatibles', type: 'text' },
    { key: 'useForPartnerBalance', label: 'Balance tiers', type: 'select', options: ['true', 'false'] },
    { key: 'isTaxAuthorizedOnMoveLine', label: 'Taxe autorisée', type: 'select', options: ['true', 'false'] },
    { key: 'isTaxRequiredOnMoveLine', label: 'Taxe requise', type: 'select', options: ['true', 'false'] },
    { key: 'defaultTaxSet', label: 'Taxe par défaut', type: 'text' },
    { key: 'vatSystemSelect', label: 'Système TVA', type: 'text' },
    { key: 'isRetrievedOnPaymentSession', label: 'Recouvrement', type: 'select', options: ['true', 'false'] },
    { key: 'serviceType.code', label: 'Type service', type: 'text' },
    { key: 'manageCutOffPeriod', label: 'Gestion cut-off', type: 'select', options: ['true', 'false'] },
    { key: 'hasAutomaticApplicationAccountingDate', label: 'Date auto', type: 'select', options: ['true', 'false'] },
    { key: 'analyticDistributionAuthorized', label: 'Distribution analytique autorisée', type: 'select', options: ['true', 'false'] },
    { key: 'analyticDistributionRequiredOnInvoiceLines', label: 'Distribution analytique requise (factures)', type: 'select', options: ['true', 'false'] },
    { key: 'analyticDistributionRequiredOnMoveLines', label: 'Distribution analytique requise (écritures)', type: 'select', options: ['true', 'false'] },
    { key: 'analyticDistributionTemplate.importId', label: 'Modèle distribution analytique', type: 'text' },
    { key: 'statusSelect', label: 'Statut', type: 'text' },
    { key: 'isCNCJ', label: 'CNCJ', type: 'select', options: ['true', 'false'] }
  ];

  const handleMetadataFieldChange = (accountId: string, fieldKey: string, value: string) => {
    const row = metadataData.find(r => r.id === accountId);
    if (row) {
      const updatedMetadata = { ...row.inheritedData, [fieldKey]: value };
      onMetadataChange(accountId, updatedMetadata);
    }
  };

  return (
    <div className="space-y-4">
      {/* Statistiques */}
      <StepStatsGrid columns={4}>
        <StepStat value={totalCount} label="Total comptes" color="blue" />
        <StepStat value={accountsWithClosestMatch.length} label="Avec correspondance proche" color="green" />
        <StepStat value={accountsWithoutClosestMatch.length} label="Sans correspondance" color="red" />
        <StepStat value={needingMetadataCount > 0 ? Math.round((needingMetadataCount / totalCount) * 100) : 0} label="% avec métadonnées manquantes" color="purple" />
      </StepStatsGrid>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">📋 Instructions</h3>
        <p className="text-sm text-blue-700">
          Cette étape affiche les comptes clients qui ne sont pas présents dans le plan comptable général (PCG) 
          et qui nécessitent un remplissage des métadonnées. 
          <span className="font-semibold text-green-700">Les cartes vertes</span> indiquent qu'une correspondance proche a été trouvée 
          et les métadonnées sont pré-remplies. 
          <span className="font-semibold text-red-700">Les cartes rouges</span> indiquent qu'aucune correspondance n'a été trouvée 
          et les métadonnées doivent être saisies manuellement.
        </p>
      </div>

      {/* Filtre */}
      {accountsNeedingMetadata.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex justify-center space-x-2 flex-wrap">
            <button
              onClick={() => setSelectedAccountId(null)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                !selectedAccountId 
                  ? 'bg-orange-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Tous les comptes avec métadonnées manquantes ({needingMetadataCount})
            </button>
          </div>
        </div>
      )}

      {/* Cartes des comptes */}
      {filteredData.length === 0 ? (
        <StepEmptyState
          icon="✅"
          title="Aucune métadonnée manquante"
          description="Tous les comptes ont des correspondances dans le PCG."
        />
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="max-h-[28rem] overflow-y-auto pr-1">
            <div className="space-y-4">
              {filteredData.map((row) => (
                <div
                  key={row.id}
                  className={`border rounded-lg p-4 shadow-sm ${
                    row.hasClosestMatch 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{row.title}</h3>
                      <p className="text-sm text-gray-600 font-mono">{row.finalCode}</p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      row.hasClosestMatch
                        ? 'bg-green-600 text-white'
                        : 'bg-red-600 text-white'
                    }`}>
                      {row.hasClosestMatch ? '✓ Correspondance trouvée' : '✗ Aucune correspondance'}
                    </span>
                  </div>

                  {/* Grille de métadonnées */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {metadataFields.map((field) => {
                      const value = row.inheritedData[field.key] || '';
                      
                      return (
                        <div key={field.key} className="flex flex-col">
                          <label className="text-xs font-medium text-gray-700 mb-1">
                            {field.label}
                          </label>
                          {field.type === 'select' ? (
                            <select
                              value={value}
                              onChange={(e) => handleMetadataFieldChange(row.id, field.key, e.target.value)}
                              className={`px-3 py-1 text-sm border rounded-md focus:ring-2 focus:border ${
                                row.hasClosestMatch
                                  ? 'border-green-300 focus:ring-green-500 focus:border-green-500'
                                  : 'border-red-300 focus:ring-red-500 focus:border-red-500'
                              }`}
                            >
                              {field.options?.map((option) => (
                                <option key={option} value={option}>
                                  {option === 'true' ? 'Oui' : option === 'false' ? 'Non' : option}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={value}
                              onChange={(e) => handleMetadataFieldChange(row.id, field.key, e.target.value)}
                              className={`px-3 py-1 text-sm border rounded-md focus:ring-2 focus:border ${
                                row.hasClosestMatch
                                  ? 'border-green-300 focus:ring-green-500 focus:border-green-500'
                                  : 'border-red-300 focus:ring-red-500 focus:border-red-500'
                              }`}
                              placeholder={field.key.includes('importId') ? 'AT001' : ''}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={onPrevious}
          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
        >
          ← Précédent
        </button>
        <button
          onClick={onNext}
          className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
        >
          Suivant →
        </button>
      </div>
    </div>
  );
};
