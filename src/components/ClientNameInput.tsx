import React from 'react';

interface ClientNameInputProps {
  clientName: string;
  onClientNameChange: (name: string) => void;
}

export const ClientNameInput: React.FC<ClientNameInputProps> = ({
  clientName,
  onClientNameChange
}) => {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="clientName" className="text-sm font-medium text-gray-700">
        Nom du client :
      </label>
      <input
        id="clientName"
        type="text"
        value={clientName}
        onChange={(e) => {
          console.log('ClientNameInput - onChange:', e.target.value);
          onClientNameChange(e.target.value);
        }}
        placeholder="Entrez le nom du client..."
        maxLength={100}
        className="w-48 px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
      />
    </div>
  );
};
