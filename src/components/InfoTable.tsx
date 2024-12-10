import React from 'react';

interface InfoTableProps {
  title?: string;
  rows: {
    label: string;
    value: string;
    editable?: boolean;
    onChange?: (value: string) => void;
  }[];
}

export const InfoTable: React.FC<InfoTableProps> = ({ title, rows }) => {
  return (
    <div className="w-full">
      {title && (
        <div className="bg-[rgb(0,106,60)] text-white px-4 py-2 font-medium">
          {title}
        </div>
      )}
      <div className="border border-gray-200">
        {rows.map((row, index) => (
          <div
            key={index}
            className="grid grid-cols-2 border-b last:border-b-0 border-gray-200"
          >
            <div className="p-2 text-[rgb(0,106,60)]">{row.label}</div>
            {row.editable ? (
              <input
                type="text"
                value={row.value}
                onChange={(e) => row.onChange?.(e.target.value)}
                className="p-2 border-l border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <div className="p-2 border-l border-gray-200">{row.value}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
