import React from 'react';
import { Listbox } from '@headlessui/react';
import { ChevronsUpDown } from 'lucide-react';

interface StatusDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  type?: 'audit' | 'element';
}

const getStatusStyle = (status: string, type: 'audit' | 'element') => {
  if (type === 'audit') {
    return 'bg-white border border-gray-300';
  }

  switch (status) {
    case 'Conforme':
      return 'border-green-500';
    case 'Non conforme':
      return 'border-red-500';
    default:
      return 'border-gray-500';
  }
};

export const StatusDropdown: React.FC<StatusDropdownProps> = ({
  value,
  onChange,
  options,
  type = 'element'
}) => {
  return (
    <Listbox value={value} onChange={onChange}>
      <div className="relative mt-1">
        <Listbox.Button
          className={`relative w-full cursor-pointer rounded-lg py-2 pl-3 pr-10 text-left focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm ${getStatusStyle(
            value,
            type
          )}`}
        >
          <span className="block truncate">{value}</span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronsUpDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </span>
        </Listbox.Button>
        <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
          {options.map((option) => (
            <Listbox.Option
              key={option}
              value={option}
              className={({ active }) =>
                `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                  active ? 'bg-amber-100 text-amber-900' : 'text-gray-900'
                }`
              }
            >
              {({ selected }) => (
                <>
                  <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                    {option}
                  </span>
                  {selected && (
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-amber-600">
                      ✓
                    </span>
                  )}
                </>
              )}
            </Listbox.Option>
          ))}
        </Listbox.Options>
      </div>
    </Listbox>
  );
};
