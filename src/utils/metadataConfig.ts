/**
 * Configuration des champs de métadonnées pour l'étape 8
 * Extraite de Step8MetadataCompletion.tsx pour centraliser et réutiliser
 */
export const metadataFields = [
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
] as const;

export type MetadataField = typeof metadataFields[number];
