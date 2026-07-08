import React from 'react';

interface CompanyCodeInputProps {
  companyCode: string;
  onCompanyCodeChange: (code: string) => void;
}

export const CompanyCodeInput: React.FC<CompanyCodeInputProps> = ({
  companyCode,
  onCompanyCodeChange
}) => {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="companyCode" className="text-sm font-medium text-gray-700">
        Code société :
      </label>
      <input
        id="companyCode"
        type="text"
        value={companyCode}
        onChange={(e) => onCompanyCodeChange(e.target.value)}
        placeholder="Ex : SERARL"
        maxLength={50}
        className="w-48 px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
      />
    </div>
  );
};
