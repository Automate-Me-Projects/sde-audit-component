import React from 'react';
import { Check, Loader2, AlertCircle, Clock } from 'lucide-react';
import type { SaveStatus } from '../types';

interface SaveIndicatorProps {
  status: SaveStatus;
}

export const SaveIndicator: React.FC<SaveIndicatorProps> = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'saved':
        return {
          icon: <Check className="h-4 w-4" />,
          text: 'Sauvegardé',
          bgColor: 'bg-green-100',
          textColor: 'text-green-700',
          borderColor: 'border-green-300',
        };
      case 'saving':
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          text: 'Sauvegarde...',
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-700',
          borderColor: 'border-blue-300',
        };
      case 'pending':
        return {
          icon: <Clock className="h-4 w-4" />,
          text: 'En attente',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-700',
          borderColor: 'border-yellow-300',
        };
      case 'error':
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          text: 'Erreur',
          bgColor: 'bg-red-100',
          textColor: 'text-red-700',
          borderColor: 'border-red-300',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 rounded-full border ${config.bgColor} ${config.textColor} ${config.borderColor} text-xs sm:text-sm transition-all duration-300`}
    >
      {config.icon}
      <span className="hidden sm:inline">{config.text}</span>
    </div>
  );
};
