import React from 'react';
import { Download } from 'lucide-react';
import { Sale } from '../types';
import { formatCurrency, formatTime } from '../utils/formatters';
import { utils, writeFile } from 'xlsx';

interface SalesHistoryProps {
  sales: Sale[];
}

const SalesHistory: React.FC<SalesHistoryProps> = ({ sales }) => {
  const handleExportToExcel = () => {
    const data = sales.map(sale => ({
      Date: new Date(sale.timestamp).toLocaleDateString(),
      Time: new Date(sale.timestamp).toLocaleTimeString(),
      Amount: sale.total,
      RunningTotal: calculateRunningTotal(sale)
    }));

    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Sales");
    writeFile(wb, "yard-sale-sales.xlsx");
  };

  const calculateRunningTotal = (currentSale: Sale): number => {
    const index = sales.findIndex(sale => sale.id === currentSale.id);
    return sales
      .slice(0, index + 1)
      .reduce((sum, sale) => sum + sale.total, 0);
  };

  if (sales.length === 0) {
    return (
      <div className="flex-grow flex items-center justify-center text-gray-500 italic">
        No sales recorded yet
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <button 
        onClick={handleExportToExcel}
        className="mb-4 px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors flex items-center justify-center gap-2"
      >
        <Download className="w-4 h-4" />
        Export to Excel
      </button>
      <div className="sales-list flex-grow">
        {sales.map((sale, index) => (
          <div 
            key={sale.id} 
            className="fade-in border-b border-gray-100 py-3"
          >
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-baseline gap-2">
                <span className="money font-semibold text-gray-800 text-lg">
                  {formatCurrency(sale.total)}
                </span>
                <span className="text-sm text-gray-500">
                  {formatTime(sale.timestamp)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Total:</span>
                <span className="money font-semibold text-emerald-600">
                  {formatCurrency(calculateRunningTotal(sale))}
                </span>
              </div>
            </div>
            {index === 0 && (
              <div className="text-xs text-emerald-600 font-medium">
                ↑ Most recent sale
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SalesHistory;