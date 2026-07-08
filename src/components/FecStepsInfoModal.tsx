import React from 'react';
import { APP_VERSION, formatVersion } from '../utils/version';

interface FecStepsInfoModalProps {
  onClose: () => void;
}

export const FecStepsInfoModal: React.FC<FecStepsInfoModalProps> = ({ onClose }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fec-steps-info-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 id="fec-steps-info-title" className="text-lg font-semibold text-gray-900">
            Vérification Fichier FEC — parcours
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
          {/* Étape 1 */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">📁</span>
              <h3 className="text-base font-semibold text-gray-900">1. Chargement des fichiers</h3>
            </div>
            <div className="p-4">
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• <strong>Fichier FEC</strong> (obligatoire) — le fichier des écritures comptables à vérifier (norme A47 A-1)</li>
                <li>• <strong>PCG avec CNCJ et comptes clients</strong> (optionnel) — pour contrôler que les comptes du FEC existent dans le plan comptable</li>
                <li>• <strong>Table de correspondances</strong> (optionnel) — pour reconnaître les comptes déjà mappés lors de l'intégration PCG</li>
                <li>• Encodage géré automatiquement (UTF-8 avec repli Windows-1252 pour les accents)</li>
              </ul>
            </div>
          </div>

          {/* Étape 2 */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">📊</span>
              <h3 className="text-base font-semibold text-gray-900">2. Rapport de conformité</h3>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-600">Contrôles effectués sur le fichier :</p>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• <strong>Structure</strong> : guillemets englobants, 18 colonnes normées, nombre de champs par ligne</li>
                <li>• <strong>Formats</strong> : dates AAAAMMJJ, montants Débit/Crédit numériques, champs obligatoires</li>
                <li>• <strong>Devise (Axelor)</strong> : Idevise = « EUR » et Montantdevise = valeur absolue du Débit/Crédit</li>
                <li>• <strong>Équilibres</strong> : Débit = Crédit (global et par écriture)</li>
                <li>• <strong>Cohérence</strong> : date homogène par écriture</li>
                <li>• <strong>Cohérence PCG</strong> : comptes du FEC présents dans le plan comptable (via correspondances)</li>
              </ul>
              <p className="text-sm text-gray-600 pt-2">Actions disponibles :</p>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• <strong>🛠️ Corriger Idevise / Montantdevise</strong> — télécharge un FEC corrigé pour Axelor</li>
                <li>• <strong>⬇️ Exporter le rapport (Excel)</strong> — rapport détaillé de toutes les anomalies</li>
              </ul>
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
