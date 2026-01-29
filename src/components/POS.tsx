import React, { useEffect, useMemo, useState } from "react";
import { X, Trash2 } from "lucide-react";
import SalesHistory from "./SalesHistory";
import { Sale } from "../types";
import { formatCurrency } from "../utils/formatters";

type Category = "Candy" | "Thrift" | "Jewelry" | "Books" | "Crafts" | "Clothes";

type Item = {
  id: string;
  name: string;
  price: number;
};

const CATEGORIES: Category[] = ["Candy", "Thrift", "Jewelry", "Books", "Crafts", "Clothes"];

// 👇 Replace these with your real items/prices.
const ITEMS_BY_CATEGORY: Record<Category, Item[]> = {
  Candy: [
    { id: "c-1", name: "Sour Gummies", price: 2.99 },
    { id: "c-2", name: "Chocolate Bar", price: 1.99 },
    { id: "c-3", name: "Lollipop", price: 0.5 },
  ],
  Thrift: [
    { id: "t-1", name: "Mug", price: 3.0 },
    { id: "t-2", name: "Picture Frame", price: 6.0 },
  ],
  Jewelry: [
    { id: "j-1", name: "Ring", price: 12.0 },
    { id: "j-2", name: "Necklace", price: 18.0 },
  ],
  Books: [
    { id: "b-1", name: "Paperback", price: 4.0 },
    { id: "b-2", name: "Hardcover", price: 8.0 },
  ],
  Crafts: [
    { id: "cr-1", name: "Handmade Item", price: 10.0 },
  ],
  Clothes: [
    { id: "cl-1", name: "T-shirt", price: 8.0 },
    { id: "cl-2", name: "Hoodie", price: 20.0 },
  ],
};

const TAX_RATE = 0.14;

const POS: React.FC = () => {
  const [category, setCategory] = useState<Category>("Candy");
  const [search, setSearch] = useState("");

  const [currentTotal, setCurrentTotal] = useState(0);
  const [calculations, setCalculations] = useState<string[]>([]);

  const [sales, setSales] = useState<Sale[]>([]);
  const [taxEnabled, setTaxEnabled] = useState(true);

  const [showTotalModal, setShowTotalModal] = useState(false);
  const [amountTendered, setAmountTendered] = useState("0.00");
  const [changeDue, setChangeDue] = useState<number | null>(null);

  const [showHistory, setShowHistory] = useState(false);

  // Load / save sales
  useEffect(() => {
    const saved = localStorage.getItem("yard-sale-pos-sales");
    if (saved) setSales(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("yard-sale-pos-sales", JSON.stringify(sales));
  }, [sales]);

  const totalSales = useMemo(
    () => sales.reduce((sum, s) => sum + s.total, 0),
    [sales]
  );

  const filteredItems = useMemo(() => {
    const list = ITEMS_BY_CATEGORY[category] ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (it) =>
        it.name.toLowerCase().includes(q) ||
        formatCurrency(it.price).toLowerCase().includes(q)
    );
  }, [category, search]);

  const calculateTaxBreakdown = (total: number) => {
    if (!taxEnabled) return { subtotal: total, tax: 0, total };
    const subtotal = total / (1 + TAX_RATE);
    const tax = total - subtotal;
    return { subtotal, tax, total };
  };

  const addLine = (label: string, amount: number) => {
    setCurrentTotal((prev) => prev + amount);
    setCalculations((prev) => [...prev, `${label} (${formatCurrency(amount)})`]);
  };

  const handleAddItem = (item: Item) => {
    addLine(item.name, item.price);
  };

  const handleDeleteLast = () => {
    if (calculations.length === 0) return;

    // Recompute from lines (simple + reliable)
    const next = calculations.slice(0, -1);
    setCalculations(next);

    // Recalculate total from the labels we stored
    // NOTE: This assumes our "( $x.xx )" format stays consistent.
    const newTotal = next.reduce((sum, line) => {
      const match = line.match(/\((?:\$)?([\d.]+)\)$/);
      if (!match) return sum;
      return sum + parseFloat(match[1]);
    }, 0);

    setCurrentTotal(newTotal);
  };

  const handleClearSale = () => {
    setCurrentTotal(0);
    setCalculations([]);
    setShowTotalModal(false);
    setAmountTendered("0.00");
    setChangeDue(null);
  };

  const handleCompleteSale = () => {
    if (currentTotal <= 0) return;
    const newSale: Sale = { id: Date.now(), timestamp: new Date(), total: currentTotal };
    setSales((prev) => [newSale, ...prev]);
    handleClearSale();
  };

  const handleTotalClick = () => {
    if (currentTotal <= 0) return;
    setShowTotalModal(true);
    setAmountTendered("0.00");
    setChangeDue(null);
  };

  const breakdown = calculateTaxBreakdown(currentTotal);

  return (
    <div className="h-dvh bg-gray-50">
      {/* Top bar */}
      <div className="px-3 sm:px-4 py-3 flex items-center justify-between border-b bg-white">
        <div>
          <div className="text-sm text-gray-500">Quick POS</div>
          <div className="text-base font-semibold">Canadian Beats Marketplace</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(true)}
            className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-semibold"
          >
            History
          </button>

          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 px-3 py-2 rounded-lg bg-gray-100">
            <input
              type="checkbox"
              checked={taxEnabled}
              onChange={(e) => setTaxEnabled(e.target.checked)}
              className="w-4 h-4"
            />
            NS HST (14%)
          </label>
        </div>
      </div>

      {/* Main layout */}
      <div className="h-[calc(100dvh-56px)] grid grid-rows-[1fr_auto]">
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-3 p-3 sm:p-4 overflow-hidden">
          {/* Category rail */}
          <aside className="bg-white rounded-2xl border p-2 md:p-3 overflow-auto">
            <div className="text-xs font-semibold text-gray-500 px-2 py-2">Categories</div>

            <div className="grid grid-cols-3 md:grid-cols-1 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setCategory(c);
                    setSearch("");
                  }}
                  className={[
                    "rounded-xl px-3 py-3 font-semibold text-sm md:text-base border transition",
                    c === category
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white hover:bg-gray-50 text-gray-800 border-gray-200",
                  ].join(" ")}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="mt-4 px-2 py-2 text-xs text-gray-500">
              Total Sales Today: <span className="font-semibold text-gray-700">{formatCurrency(totalSales)}</span>
            </div>
          </aside>

          {/* Items area */}
          <main className="bg-white rounded-2xl border p-3 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs text-gray-500">Items</div>
                <div className="text-lg font-semibold">{category}</div>
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-[min(420px,60%)] px-3 py-2 rounded-xl border bg-gray-50 focus:bg-white outline-none"
              />
            </div>

            <div className="mt-3 overflow-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                {filteredItems.map((it) => (
                  <button
                    key={it.id}
                    onClick={() => handleAddItem(it)}
                    className="rounded-2xl border bg-gray-50 hover:bg-gray-100 active:scale-[0.99] transition p-4 text-left min-h-[92px]"
                  >
                    <div className="font-semibold text-base">{it.name}</div>
                    <div className="text-sm text-gray-600 mt-1">{formatCurrency(it.price)}</div>
                  </button>
                ))}

                {filteredItems.length === 0 && (
                  <div className="col-span-full text-center text-gray-500 py-10">
                    No items found. (Either your search is wild, or you need to add inventory.)
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>

        {/* Sticky cart footer */}
        <footer className="sticky bottom-0 bg-white border-t px-3 sm:px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-gray-500">Current Total</div>
              <div className="text-2xl font-extrabold tracking-tight">{formatCurrency(currentTotal)}</div>
              {taxEnabled && currentTotal > 0 && (
                <div className="text-xs text-gray-500">
                  Subtotal {formatCurrency(breakdown.subtotal)} + Tax {formatCurrency(breakdown.tax)}
                </div>
              )}
              {calculations.length > 0 && (
                <div className="text-xs text-gray-500 truncate max-w-[65vw]">
                  {calculations.join(" + ")}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDeleteLast}
                disabled={calculations.length === 0}
                className={[
                  "px-3 py-3 rounded-xl font-semibold border flex items-center gap-2",
                  calculations.length === 0
                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                    : "bg-white hover:bg-gray-50 text-gray-800 border-gray-200",
                ].join(" ")}
              >
                <Trash2 className="w-4 h-4" />
                Undo
              </button>

              <button
                onClick={handleTotalClick}
                disabled={currentTotal <= 0}
                className={[
                  "px-4 py-3 rounded-xl font-semibold text-white",
                  currentTotal <= 0 ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700",
                ].join(" ")}
              >
                Total / Pay
              </button>
            </div>
          </div>
        </footer>
      </div>

      {/* Payment modal */}
      {showTotalModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border p-4 relative">
            <button
              onClick={() => setShowTotalModal(false)}
              className="absolute top-3 right-3 p-2 rounded-lg hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>

            <div className="text-lg font-bold">Sale Total</div>
            <div className="mt-2 text-2xl font-extrabold">{formatCurrency(currentTotal)}</div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {[20, 10, 5, 2, 1, 0.25].map((val) => (
                <button
                  key={val}
                  onClick={() => {
                    const newAmount = parseFloat(amountTendered) + val;
                    setAmountTendered(newAmount.toFixed(2));
                    setChangeDue(newAmount - currentTotal);
                  }}
                  className="rounded-xl border bg-gray-50 hover:bg-gray-100 p-3 font-semibold"
                >
                  + {formatCurrency(val)}
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between text-sm">
              <div>Tendered: <span className="font-semibold">${amountTendered}</span></div>
              {changeDue !== null && changeDue >= 0 && (
                <div className="font-semibold">Change: {formatCurrency(changeDue)}</div>
              )}
              {changeDue !== null && changeDue < 0 && (
                <div className="font-semibold text-rose-600">
                  Need {formatCurrency(Math.abs(changeDue))} more
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  setAmountTendered(currentTotal.toFixed(2));
                  setChangeDue(0);
                }}
                className="flex-1 py-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold"
              >
                Exact
              </button>

              <button
                onClick={() => {
                  setAmountTendered("0.00");
                  setChangeDue(null);
                }}
                className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 font-semibold"
              >
                Clear
              </button>
            </div>

            <div className="mt-2 flex gap-2">
              <button
                onClick={() => setShowTotalModal(false)}
                className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  handleCompleteSale();
                  setShowTotalModal(false);
                }}
                disabled={changeDue === null || changeDue < 0}
                className={[
                  "flex-1 py-3 rounded-xl font-semibold text-white",
                  changeDue !== null && changeDue >= 0
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-gray-400 cursor-not-allowed",
                ].join(" ")}
              >
                Complete Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border p-4 relative">
            <button
              onClick={() => setShowHistory(false)}
              className="absolute top-3 right-3 p-2 rounded-lg hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>

            <div className="text-lg font-bold mb-3">Sales History</div>
            <SalesHistory
              sales={sales}
              onClearAll={() => {
                if (confirm("Clear all sales history?")) setSales([]);
              }}
              onRefund={(saleId: number) => {
                const sale = sales.find((s) => s.id === saleId);
                if (sale && confirm(`Refund ${formatCurrency(sale.total)}?`)) {
                  setSales((prev) => prev.filter((s) => s.id !== saleId));
                }
              }}
              totalSales={totalSales}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
