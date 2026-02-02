import React from "react";
import { Download, RefreshCw } from "lucide-react";
import { Sale } from "../types";
import { formatCurrency, formatTime } from "../utils/formatters";
import { utils, writeFile } from "xlsx";

interface SalesHistoryProps {
  sales: Sale[];
  onRefund?: (saleId: number) => void;
  onClearToday?: () => void;
}

const SalesHistory: React.FC<SalesHistoryProps> = ({
  sales,
  onRefund,
  onClearToday,
}) => {
  const toDateObj = (d: Date | string) => (d instanceof Date ? d : new Date(d));

  const handleExportToExcel = () => {
    const today = new Date();
    const dateString = today.toISOString().split("T")[0];
    const filename = `yard-sale-sales-${dateString}.xlsx`;

    // Sheet 1: Summary (one row per sale)
    const summary = sales.map((sale) => {
      const ts = toDateObj(sale.timestamp);
      return {
        SaleID: sale.id,
        Date: ts.toLocaleDateString(),
        Time: ts.toLocaleTimeString(),
        Payment: (sale.paymentType ?? "cash").toUpperCase(),
        Total: Number((sale.total ?? 0).toFixed(2)),
      };
    });

    // Sheet 2: Sale lines (one row per line item — best for Excel pivots)
    const linesSheet: Array<Record<string, any>> = [];
    sales.forEach((sale) => {
      const ts = toDateObj(sale.timestamp);
      const saleLines = sale.lines ?? [];

      if (saleLines.length === 0) {
        linesSheet.push({
          SaleID: sale.id,
          TimestampISO: ts.toISOString(),
          Date: ts.toLocaleDateString(),
          Time: ts.toLocaleTimeString(),
          Payment: (sale.paymentType ?? "cash").toUpperCase(),
          Category: "",
          Item: "",
          UnitPrice: "",
          Qty: "",
          LineTotal: "",
          SaleTotal: Number((sale.total ?? 0).toFixed(2)),
        });
        return;
      }

      saleLines.forEach((ln) => {
        const unit = Number(ln.unitAmount ?? 0);
        const qty = Number(ln.qty ?? 1);
        const lineTotal = unit * qty;

        linesSheet.push({
          SaleID: sale.id,
          TimestampISO: ts.toISOString(),
          Date: ts.toLocaleDateString(),
          Time: ts.toLocaleTimeString(),
          Payment: (sale.paymentType ?? "cash").toUpperCase(),
          Category: ln.category ?? "",
          Item: ln.label ?? "",
          UnitPrice: Number(unit.toFixed(2)),
          Qty: qty,
          LineTotal: Number(lineTotal.toFixed(2)),
          SaleTotal: Number((sale.total ?? 0).toFixed(2)),
        });
      });
    });

    const wb = utils.book_new();
    utils.book_append_sheet(wb, utils.json_to_sheet(summary), "Sales Summary");
    utils.book_append_sheet(wb, utils.json_to_sheet(linesSheet), "Sale Lines");
    writeFile(wb, filename);

    // ✅ After export, ask to clear TODAY only
    const shouldClear = window.confirm(
      "Exported! Clear TODAY'S sales history now?"
    );
    if (shouldClear) onClearToday?.();
  };

  const calculateRunningTotal = (currentSale: Sale): number => {
    const index = sales.findIndex((sale) => sale.id === currentSale.id);
    return sales
      .slice(0, index + 1)
      .reduce((sum, sale) => sum + (sale.total ?? 0), 0);
  };

  const getCategorySummary = (sale: Sale) => {
    const saleLines = sale.lines ?? [];
    if (!saleLines.length) return "";

    const map = new Map<string, number>();
    for (const l of saleLines) {
      const cat = l.category ?? "";
      if (!cat) continue;
      map.set(cat, (map.get(cat) ?? 0) + (l.qty ?? 1));
    }

    return Array.from(map.entries())
      .map(([cat, qty]) => `${cat} x${qty}`)
      .join(" • ");
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

      <div className="sales-list flex-grow overflow-auto">
        {sales.map((sale, index) => (
          <div key={sale.id} className="fade-in border-b border-gray-100 py-3">
            <div className="flex justify-between items-center mb-1">
              <div className="flex flex-col min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="money font-semibold text-gray-800 text-lg">
                    {formatCurrency(sale.total ?? 0)}
                  </span>
                  <span className="text-sm text-gray-500">
                    {formatTime(sale.timestamp)}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-semibold">
                    {(sale.paymentType ?? "cash").toUpperCase()}
                  </span>
                </div>

                <div className="text-xs text-gray-500 mt-1 truncate">
                  {getCategorySummary(sale)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Total:</span>
                <span className="money font-semibold text-blue-600">
                  {formatCurrency(calculateRunningTotal(sale))}
                </span>

                {onRefund && (
                  <button
                    onClick={() => onRefund(sale.id)}
                    className="ml-2 p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Refund this sale"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {index === 0 && (
              <div className="text-xs text-blue-600 font-medium">
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
