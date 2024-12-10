import React from 'react';
import type { IcpeType } from '../types';

interface ICPETableComponentProps {
  icpeTypes: IcpeType[];
  onCapacityChange: (index: number, value: string) => void;
}

export const ICPETable: React.FC<ICPETableComponentProps> = ({ icpeTypes = [], onCapacityChange }) => {
  return (
    <div className="w-full">
      <h2 className="text-[rgb(0,106,60)] text-xl font-medium mb-4">ICPE</h2>
      <div className="w-full overflow-x-auto">
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
            {icpeTypes?.map((icpe, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {icpe.rubrique}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {icpe.description}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <input
                    type="text"
                    value={icpe.capacity}
                    onChange={(e) => onCapacityChange(index, e.target.value)}
                    className="w-full p-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {icpe.regime}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
