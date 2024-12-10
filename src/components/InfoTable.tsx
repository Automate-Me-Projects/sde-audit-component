import React from 'react';

interface Row {
  label: string;
  value: string;
  editable?: boolean;
  onChange?: (value: string) => void;
}

interface InfoTableProps {
  title?: string;
  rows: Row[];
}

export const InfoTable: React.FC<InfoTableProps> = ({ title, rows }) => {
  const isDateField = (label: string) => {
    return label.toLowerCase().includes('date');
  };

  return (
    <div className="w-full mb-8">
      {title && <h2 className="text-[rgb(0,106,60)] text-xl font-medium mb-4">{title}</h2>}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="border-t border-gray-200">
          {rows.map((row, index) => (
            <div key={index} className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 hover:bg-gray-50">
              <dt className="text-sm font-medium text-gray-500">{row.label}</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {row.editable ? (
                  isDateField(row.label) ? (
                    <input
                      type="date"
                      value={row.value}
                      onChange={(e) => row.onChange?.(e.target.value)}
                      className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                    />
                  ) : (
                    <input
                      type="text"
                      value={row.value}
                      onChange={(e) => row.onChange?.(e.target.value)}
                      className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                    />
                  )
                ) : (
                  row.value
                )}
              </dd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
