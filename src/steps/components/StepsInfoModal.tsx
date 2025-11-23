import React from 'react';
import { STEPS_CONFIG } from '../../config/stepsConfig';
import { APP_VERSION, formatVersion } from '../../utils/version';

interface StepsInfoModalProps {
  onClose: () => void;
}

export const StepsInfoModal: React.FC<StepsInfoModalProps> = ({ onClose }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="steps-info-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 id="steps-info-title" className="text-lg font-semibold text-gray-900">
            Parcours de traitement
          </h2>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
              {formatVersion(APP_VERSION)}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Fermer la fenêtre d'information"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-4 space-y-6">
          {STEPS_CONFIG.filter(step => step.id !== 'stepFinal').map(step => (
            <div key={step.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl" aria-hidden="true">{step.icon}</span>
                  <h3 className="text-base font-semibold text-gray-900">
                    {step.order}. {step.title}
                  </h3>
                </div>
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
                  {step.badge}
                </span>
              </div>
              
              <div className="space-y-3">
                <p className="text-sm text-gray-600 leading-relaxed">
                  {step.description}
                </p>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">📋 Règles de traitement :</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {step.id === 'step1' && (
                      <>
                        <li>• Importer 2 fichiers CSV obligatoires : comptes clients et comptes PCG_CNCJ</li>
                        <li>• Validation automatique des colonnes requises (numéro, titre, etc.)</li>
                        <li>• Détection des erreurs de formatage et des données manquantes</li>
                        <li>• Séparation automatique des comptes CNCJ du fichier PCG_CNCJ</li>
                        <li>• Vérification que tous les fichiers sont correctement chargés</li>
                      </>
                    )}
                    {step.id === 'step2' && (
                      <>
                        <li>• Fusion automatique des comptes ayant le même numéro ET le même titre</li>
                        <li>• Regroupement des montants pour les comptes fusionnés</li>
                        <li>• Conservation du premier numéro et titre rencontrés</li>
                        <li>• Aucune action manuelle requise - visualisation uniquement</li>
                        <li>• Les fusions réduisent le nombre de doublons à traiter</li>
                      </>
                    )}
                    {step.id === 'step3' && (
                      <>
                        <li>• Standardisation obligatoire : tous les numéros doivent avoir exactement 7 chiffres</li>
                        <li>• Numéros trop courts : complétion automatique avec des zéros en fin</li>
                        <li>• Numéros trop longs : troncature automatique pour garder 7 chiffres</li>
                        <li>• Affichage avant/après pour validation des changements</li>
                        <li>• Application obligatoire avant de continuer aux étapes suivantes</li>
                      </>
                    )}
                    {step.id === 'step4' && (
                      <>
                        <li>• Détection des doublons basée sur le numéro de compte uniquement</li>
                        <li>• Conserver le compte avec le montant le plus élevé comme compte principal</li>
                        <li>• Les autres comptes doublons doivent recevoir un nouveau numéro unique</li>
                        <li>• Suggestion automatique de numéros de remplacement disponibles</li>
                        <li>• Validation que les nouveaux numéros n'existent pas déjà</li>
                        <li>• Résolution obligatoire de tous les doublons pour continuer</li>
                      </>
                    )}
                    {step.id === 'step5' && (
                      <>
                        <li>• Récapitulatif des corrections de doublons appliquées à l'étape 4</li>
                        <li>• Visualisation des comptes modifiés avec leurs anciens et nouveaux numéros</li>
                        <li>• Vérification que toutes les corrections ont été correctement appliquées</li>
                        <li>• Possibilité de revenir en arrière si une correction semble incorrecte</li>
                        <li>• Étape de validation avant de passer aux conflits CNCJ</li>
                      </>
                    )}
                    {step.id === 'step6' && (
                      <>
                        <li>• Détection des conflits avec les codes clients réservés par la CNCJ</li>
                        <li>• Les comptes clients utilisant un code CNCJ doivent être modifiés</li>
                        <li>• Attribution automatique de nouveaux codes disponibles</li>
                        <li>• Respect obligatoire de la liste des codes CNCJ homologués</li>
                        <li>• Validation finale avant export des corrections</li>
                      </>
                    )}
                    {step.id === 'step7' && (
                      <>
                        <li>• Résumé complet de toutes les corrections appliquées (étapes 4 et 6)</li>
                        <li>• Visualisation des comptes modifiés avec filtres par type de correction</li>
                        <li>• Validation finale avant la complétion des métadonnées</li>
                        <li>• Dernière étape de révision avant le traitement final</li>
                        <li>• Préparation des données pour l'étape de correspondances</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          ))}

          {/* Étape finale - Correspondances manquantes */}
          <div className="border border-purple-200 bg-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden="true">🔧</span>
                <h3 className="text-base font-semibold text-purple-900">
                  8. Correspondances manquantes
                </h3>
              </div>
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                Étape Finale
              </span>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm text-purple-800 leading-relaxed">
                Traitement des lignes sans correspondances PCG pour remplir les colonnes manquantes et compléter les métadonnées.
              </p>
              
              <div className="bg-purple-100 rounded-lg p-3">
                <h4 className="text-sm font-semibold text-purple-700 mb-2">📋 Règles de traitement :</h4>
                <ul className="text-xs text-purple-600 space-y-1">
                  <li>• Identification des comptes clients sans correspondance dans le plan comptable général</li>
                  <li>• Remplissage automatique des métadonnées manquantes</li>
                  <li>• Finalisation des données avant export complet</li>
                  <li>• Validation finale de l'ensemble du traitement</li>
                  <li>• Export final des données complètes et corrigées</li>
                </ul>
              </div>
            </div>
          </div>
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
