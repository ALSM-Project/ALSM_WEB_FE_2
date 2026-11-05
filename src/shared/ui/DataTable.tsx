import React from 'react';
import { RefreshCw, Inbox } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (item: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyMessage = 'No records found',
  onRowClick,
  className = '',
}: DataTableProps<T>) {
  return (
    <div className={`overflow-x-auto border border-[#DCE3EC] rounded-lg bg-white shadow-xs ${className}`}>
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-[#F8FAFC] border-b border-[#DCE3EC]">
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className={`py-2.5 px-3.5 font-semibold text-[11px] uppercase tracking-wider text-[#17263A] select-none whitespace-nowrap ${
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                } ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E8EDF4]">
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="py-8 text-center text-[#8491A3]">
                <div className="flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#244A70]" />
                  <span>Loading data...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-8 text-center text-[#8491A3]">
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <Inbox className="w-5 h-5 text-[#8491A3]" />
                  <span className="font-medium">{emptyMessage}</span>
                </div>
              </td>
            </tr>
          ) : (
            data.map((item, index) => {
              const isClickable = Boolean(onRowClick);
              return (
                <tr
                  key={keyExtractor(item, index)}
                  onClick={isClickable ? () => onRowClick?.(item) : undefined}
                  className={`transition-colors ${
                    isClickable ? 'hover:bg-[#F4F7FB] cursor-pointer' : 'hover:bg-[#F8FAFC]'
                  }`}
                >
                  {columns.map((col) => {
                    const cellValue = (item as any)[col.key];
                    return (
                      <td
                        key={col.key}
                        className={`py-2.5 px-3.5 text-[#17263A] align-middle ${
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                        } ${col.className || ''}`}
                      >
                        {col.render ? col.render(item, index) : cellValue}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
