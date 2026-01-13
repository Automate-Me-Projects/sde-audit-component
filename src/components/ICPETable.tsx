import React, { useState, useCallback, useRef, useMemo } from 'react';
import type { ICPETableComponentProps } from '../types';
import { sortIcpeTypes } from '../utils';

export const ICPETable: React.FC<ICPETableComponentProps> = ({ icpeTypes = [], onCapacityChange }) => {
  const [inputValues, setInputValues] = useState<{[key: string]: string}>({});
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const sortedIcpeTypes = useMemo(() => sortIcpeTypes(icpeTypes), [icpeTypes]);

  const handleInputChange = useCallback((refId: string, value: string) => {
    if (!refId) return;

    // Update local state immediately
    setInputValues(prev => ({
      ...prev,
      [`${refId}-capacity`]: value
    }));

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      onCapacityChange(refId, value);
    }, 1000);
  }, [onCapacityChange]);

  const getInputValue = useCallback((refId: string): string => {
    const localValue = inputValues[`${refId}-capacity`];
    return localValue !== undefined ? localValue : sortedIcpeTypes.find(icpe => icpe.refId === refId)?.capacity || '';
  }, [sortedIcpeTypes, inputValues]);

  if (!Array.isArray(icpeTypes)) {
    return (
      <div className="w-full">
        <h2 className="text-[rgb(0,106,60)] text-xl font-medium mb-4">ICPE</h2>
        <p className="text-gray-500">No ICPE data available</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h2 className="text-[rgb(0,106,60)] text-lg sm:text-xl font-medium mb-4">ICPE</h2>

      {/* Mobile layout - Card style */}
      <div className="block md:hidden space-y-3">
        {sortedIcpeTypes.map((icpe, index) => (
          icpe?.refId ? (
            <div key={`${icpe.refId}-${index}`} className="bg-white border rounded-lg p-3 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium text-sm text-gray-900">{icpe.rubrique}</span>
                <span className="text-xs px-2 py-1 bg-gray-100 rounded">{icpe.regime}</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{icpe.description}</p>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Capacité</label>
                <input
                  type="text"
                  value={getInputValue(icpe.refId)}
                  onChange={(e) => handleInputChange(icpe.refId, e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
          ) : null
        ))}
      </div>

      {/* Desktop layout - Table */}
      <div className="hidden md:block w-full overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                Rubrique
              </th>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/6">
                Nature des activités
              </th>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/6">
                Capacité
              </th>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                Régime
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedIcpeTypes.map((icpe, index) => (
              icpe?.refId ? (
                <tr key={`${icpe.refId}-${index}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {icpe.rubrique}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {icpe.description}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <input
                      type="text"
                      value={getInputValue(icpe.refId)}
                      onChange={(e) => handleInputChange(icpe.refId, e.target.value)}
                      className="w-full p-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {icpe.regime}
                  </td>
                </tr>
              ) : null
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
