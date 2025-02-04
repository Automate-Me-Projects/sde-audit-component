import React from 'react';

interface StatusDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}

const getBorderColor = (status: string) => {
  switch (status) {
    case 'Conforme':
      return 'border-2 border-green-500';
    case 'Non conforme':
      return 'border-2 border-sde-orange';
    case 'Non conformité majeure':
      return 'border-2 border-red-500';
    default:
      return 'border-2 border-gray-300';
  }
};

export const StatusDropdown: React.FC<StatusDropdownProps> = ({
  value,
  onChange,
  options,
}) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`col-span-1 w-48 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${getBorderColor(value)}`}
    >
      <option value="">Statut</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
};
