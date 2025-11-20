import React from 'react';

// Composant pour afficher une statistique
interface StepStatProps {
  value: number;
  label: string;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
}

export const StepStat: React.FC<StepStatProps> = ({ value, label, color = 'blue' }) => {
  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    orange: 'text-orange-600',
    red: 'text-red-600',
    purple: 'text-purple-600'
  };

  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${colorClasses[color]}`}>
        {value}
      </div>
      <div className="text-gray-600 text-sm">
        {label}
      </div>
    </div>
  );
};

// Composant pour afficher une boîte d'information
interface StepInfoBoxProps {
  children: React.ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'error';
}

export const StepInfoBox: React.FC<StepInfoBoxProps> = ({ children, variant = 'info' }) => {
  const variantClasses = {
    info: 'bg-blue-50 border-blue-200 text-blue-700',
    success: 'bg-green-50 border-green-200 text-green-700',
    warning: 'bg-orange-50 border-orange-200 text-orange-700',
    error: 'bg-red-50 border-red-200 text-red-700'
  };

  return (
    <div className={`border rounded-lg p-4 ${variantClasses[variant]}`}>
      {children}
    </div>
  );
};

// Composant pour afficher un message vide
interface StepEmptyStateProps {
  icon: string;
  title: string;
  description?: string;
}

export const StepEmptyState: React.FC<StepEmptyStateProps> = ({ icon, title, description }) => {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
      <div className="text-gray-500">
        <div className="text-lg mb-2">{icon} {title}</div>
        {description && <p className="text-sm">{description}</p>}
      </div>
    </div>
  );
};

// Composant pour afficher une grille de statistiques
interface StepStatsGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5 | 6;
}

export const StepStatsGrid: React.FC<StepStatsGridProps> = ({ children, columns = 4 }) => {
  const gridClasses = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6'
  };

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4`}>
      <div className={`grid ${gridClasses[columns]} gap-4 text-sm`}>
        {children}
      </div>
    </div>
  );
};

// Composant pour afficher une légende
interface LegendItemProps {
  color: string;
  label: string;
}

const LegendItem: React.FC<LegendItemProps> = ({ color, label }) => {
  return (
    <div className="flex items-center space-x-2">
      <div className={`w-4 h-4 ${color} rounded`}></div>
      <span className="text-gray-700">{label}</span>
    </div>
  );
};

interface StepLegendProps {
  items: Array<{ color: string; label: string }>;
}

export const StepLegend: React.FC<StepLegendProps> = ({ items }) => {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
      <div className="flex items-center justify-center space-x-4 text-sm flex-wrap">
        {items.map((item, index) => (
          <LegendItem key={index} color={item.color} label={item.label} />
        ))}
      </div>
    </div>
  );
};
