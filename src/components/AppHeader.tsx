import React from 'react';
import { AppState, AppDispatch } from '../types/accounts';
import { ProjectPersistence } from './ProjectPersistence';
import { ClientNameInput } from './ClientNameInput';
import { CompanyCodeInput } from './CompanyCodeInput';
import { APP_VERSION, formatVersion } from '../utils/version';

interface AppHeaderProps {
  state: AppState;
  dispatch: AppDispatch;
  onProjectLoaded: (newState: AppState) => void;
  variant: 'home' | 'import' | 'fec';
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  state,
  dispatch,
  onProjectLoaded,
  variant
}) => {
  return (
    <>
      <div className="flex items-center justify-center gap-4 mb-2">
        <h1 className="text-3xl font-bold text-gray-900">
          🏦 Compte Processor
        </h1>
        <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
          {formatVersion(APP_VERSION)}
        </span>
      </div>
      <p className="text-gray-600">
        {variant === 'fec'
          ? "Contrôle de conformité d'un fichier FEC client (norme A47 A-1)"
          : 'Import des comptes comptables client vers le plan comptable général et CNCJ'}
      </p>

      {/* Persistance projet + nom client */}
      <div className="flex justify-center mt-4">
        <ProjectPersistence
          state={state}
          dispatch={dispatch}
          onProjectLoaded={onProjectLoaded}
        />
      </div>

      <div className="flex justify-center items-center gap-6 mt-2 flex-wrap">
        <ClientNameInput
          clientName={state.clientName}
          onClientNameChange={(name) => dispatch({ type: 'SET_CLIENT_NAME', payload: name })}
        />
        <CompanyCodeInput
          companyCode={state.companyCode}
          onCompanyCodeChange={(code) => dispatch({ type: 'SET_COMPANY_CODE', payload: code })}
        />
      </div>

      {/* Badge de titre selon le parcours */}
      {variant === 'import' && (
        <div className="mt-6 flex items-center justify-center">
          <div className="px-6 py-3 bg-gray-100 text-gray-800 rounded-lg font-medium text-lg border-2 border-gray-300">
            📁 Integration PCG
          </div>
        </div>
      )}
      {variant === 'fec' && (
        <div className="mt-6 flex items-center justify-center">
          <div className="px-6 py-3 bg-gray-100 text-gray-800 rounded-lg font-medium text-lg border-2 border-gray-300">
            🔎 Vérification Fichier FEC
          </div>
        </div>
      )}
    </>
  );
};
