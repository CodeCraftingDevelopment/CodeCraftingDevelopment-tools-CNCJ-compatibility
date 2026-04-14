import React, { useState } from 'react';
import { STEPS_CONFIG } from '../../config/stepsConfig';
import { APP_VERSION, formatVersion } from '../../utils/version';

interface StepsInfoModalProps {
  onClose: () => void;
}

export const StepsInfoModal: React.FC<StepsInfoModalProps> = ({ onClose }) => {
  const [expandedSteps, setExpandedSteps] = useState<string[]>([]);
  
  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => 
      prev.includes(stepId) 
        ? prev.filter(id => id !== stepId)
        : [...prev, stepId]
    );
  };
  
  const isExpanded = (stepId: string) => expandedSteps.includes(stepId);
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
          {/* Section sur les suggestions automatiques */}
          <div className="border border-blue-200 bg-blue-50 rounded-lg overflow-hidden">
            <div className="p-4 space-y-3">
              <h3 className="text-base font-semibold text-blue-900 flex items-center gap-2">
                💡 Suggestions automatiques de codes
              </h3>
              <p className="text-sm text-blue-800 leading-relaxed">
                Le système génère automatiquement des codes de remplacement pour résoudre les conflits.
              </p>
              <div className="bg-blue-100 rounded-lg p-3">
                <h4 className="text-sm font-semibold text-blue-700 mb-2">📋 Fonctionnalités disponibles :</h4>
                <ul className="text-xs text-blue-600 space-y-1">
                  <li>• <strong>Calcul intelligent:</strong> +1 par défaut sans jamais dépasser la dizaine</li>
                  <li>• <strong>Boutons individuels:</strong> "💡 [code]" pour appliquer une suggestion</li>
                  <li>• <strong>Validation globale:</strong> "✨ Valider les suggestions" pour tout appliquer</li>
                  <li>• <strong>Modal de détails:</strong> "Voir les détails" pour consulter les calculs</li>
                  <li>• <strong>Export combiné:</strong> CSV avec suggestions étapes 4 + 6 (case à cocher)</li>
                  <li>• <strong>Badges visuels:</strong> 🟡 Doublon / 🔴 CNCJ pour différencier les types</li>
                </ul>
              </div>
            </div>
          </div>

          {STEPS_CONFIG.filter(step => step.id !== 'stepFinal').map(step => {
            const expanded = isExpanded(step.id);
            return (
            <div key={step.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleStep(step.id)}
                className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                aria-expanded={expanded}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl" aria-hidden="true">{step.icon}</span>
                  <h3 className="text-base font-semibold text-gray-900">
                    {step.order}. {step.title}
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
                    {step.badge}
                  </span>
                  <span 
                    className={`text-gray-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  >
                    ▼
                  </span>
                </div>
              </button>
              
              {expanded && (
                <div className="p-4 space-y-3">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">📋 Règles de traitement :</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {step.id === 'step1' && (
                      <>
                        <li>• Importer 3 fichiers CSV obligatoires : comptes clients, comptes PCG et comptes CNCJ</li>
                        <li>• Validation automatique des colonnes requises (numéro, titre, etc.)</li>
                        <li>• Détection des erreurs de formatage et des données manquantes</li>
                        <li>• Chargement séparé des comptes PCG et CNCJ dans leurs listes respectives</li>
                        <li>• Vérification que tous les fichiers sont correctement chargés</li>
                      </>
                    )}
                    {step.id === 'step2' && (
                      <>
                        <li>• <strong>Algorithme:</strong> Fusion par clé composite <code>numéro-titre</code></li>
                        <li>• <strong>Calcul:</strong> Conservation de la première occurrence</li>
                        <li>• <strong>Logique:</strong> Un seul compte conservé par combinaison numéro + titre</li>
                        <li>• <strong>Filtre:</strong> Uniquement les comptes avec numéro ET titre identiques</li>
                        <li>• <strong>Résultat:</strong> Réduction automatique des doublons parfaits</li>
                      </>
                    )}
                    {step.id === 'step3' && (
                      <>
                        <li>• <strong>Algorithme:</strong> Normalisation forcée à 7 chiffres</li>
                        <li>• <strong>Calcul troncature:</strong> <code>code.length &gt; 7 ? code.slice(0, 7)</code></li>
                        <li>• <strong>Calcul complétion:</strong> <code>code.padEnd(7, '0')</code> (zéros en fin)</li>
                        <li>• <strong>Validation:</strong> Tous les numéros clients → exactement 7 chiffres</li>
                        <li>• <strong>Impact:</strong> Standardisation universelle pour les traitements suivants</li>
                      </>
                    )}
                    {step.id === 'step4' && (
                      <>
                        <li>• <strong>Algorithme:</strong> Détection par numéro exact identique</li>
                        <li>• <strong>Calcul:</strong> Comptage des occurrences par numéro de compte</li>
                        <li>• <strong>Suggestions automatiques:</strong> Génération de codes uniques (+1 sans dépasser la dizaine)</li>
                        <li>• <strong>Boutons:</strong> "💡 [code]" individuel et "✨ Valider les suggestions" global</li>
                        <li>• <strong>Validation:</strong> Vérification croisée pour éviter nouveaux conflits</li>
                        <li>• <strong>Modal:</strong> "Voir les détails" pour consulter tous les calculs de suggestions</li>
                      </>
                    )}
                    {step.id === 'step5' && (
                      <>
                        <li>• <strong>Calcul:</strong> Application des corrections de l'étape 4</li>
                        <li>• <strong>Validation:</strong> Vérification de l'intégrité des modifications</li>
                        <li>• <strong>Suivi:</strong> Historique des codes originaux → corrigés</li>
                        <li>• <strong>Contrôle:</strong> Possibilité de retour en arrière si erreur</li>
                        <li>• <strong>Statistiques:</strong> Comptage des corrections appliquées</li>
                      </>
                    )}
                    {step.id === 'step6' && (
                      <>
                        <li>• <strong>Algorithme:</strong> Détection des conflits avec les comptes CNCJ homologués</li>
                        <li>• <strong>Suggestions automatiques:</strong> Génération de codes alternatifs (+1 sans dépasser la dizaine)</li>
                        <li>• <strong>Contrainte:</strong> <code>incremented % 10 === 0 ? null : continue</code> (jamais de dizaine supérieure)</li>
                        <li>• <strong>Calcul:</strong> <code>codeNum + 1</code> avec validation croisée CNCJ + clients</li>
                        <li>• <strong>Validation:</strong> Vérification des codes CNCJ homologués</li>
                        <li>• <strong>Modal:</strong> "Voir les détails" avec export combiné (étapes 4 + 6)</li>
                        <li>• <strong>Export:</strong> Case à cocher pour inclure les suggestions de l'étape 4</li>
                      </>
                    )}
                    {step.id === 'step7' && (
                      <>
                        <li>• <strong>Calcul:</strong> Agrégation des statistiques finales (étapes 4 + 6)</li>
                        <li>• <strong>Suivi:</strong> Construction de l'historique complet des codes</li>
                        <li>• <strong>Métadonnées:</strong> Suivi des sources de modifications (étape 4/étape 6)</li>
                        <li>• <strong>Validation:</strong> Cohérence finale de toutes les corrections</li>
                        <li>• <strong>Exportation:</strong> Préparation des données pour traitement final</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
              )}
            </div>
            );
          })}

          {/* Étape finale - Correspondances manquantes */}
          <div className="border border-purple-200 bg-purple-50 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleStep('stepFinal')}
              className="w-full px-4 py-3 bg-purple-100 hover:bg-purple-200 transition-colors flex items-center justify-between"
              aria-expanded={isExpanded('stepFinal')}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden="true">🔧</span>
                <h3 className="text-base font-semibold text-purple-900">
                  8. Correspondances manquantes
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                  Étape Finale
                </span>
                <span 
                  className={`text-purple-600 transition-transform duration-200 ${isExpanded('stepFinal') ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                >
                  ▼
                </span>
              </div>
            </button>
            
            {isExpanded('stepFinal') && (
              <div className="p-4 space-y-3">
                <p className="text-sm text-purple-800 leading-relaxed">
                  Traitement des lignes sans correspondances PCG pour remplir les colonnes manquantes et compléter les métadonnées.
                </p>
              
              <div className="bg-purple-100 rounded-lg p-3">
                <h4 className="text-sm font-semibold text-purple-700 mb-2">📋 Règles de traitement :</h4>
                <ul className="text-xs text-purple-600 space-y-1">
                  <li>• <strong>Algorithme:</strong> Héritage PCG par préfixe (4 premiers chiffres), comptes de 5 digits minimum</li>
                  <li>• <strong>Calcul:</strong> Différence numérique minimale pour trouver le compte PCG le plus proche</li>
                  <li>• <strong>Logique:</strong> <code>code.substring(0, 4)</code> pour regrouper les comptes PCG (les comptes vues à 3-4 chiffres sont exclus)</li>
                  <li>• <strong>Métadonnées:</strong> Héritage automatique des données du compte PCG correspondant</li>
                  <li>• <strong>Exportation:</strong> Finalisation des données complètes et corrigées</li>
                </ul>
              </div>
            </div>
            )}
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
