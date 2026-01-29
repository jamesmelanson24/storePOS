import React, { useEffect, useMemo, useState } from "react";
import { X, Trash2 } from "lucide-react";
import PriceButton from "./PriceButton";
import SalesHistory from "./SalesHistory";
import { Sale } from "../types";
import { formatCurrency } from "../utils/formatters";

import bill20Url from "../assets/20-fotor.png";
import bill10Url from "../assets/10-fotor.png";
import bill5Url from "../assets/5-fotor.png";
import bill2Url from "../assets/2-fotor.png";
import bill1Url from "../assets/1-fotor.png";
import coin25Url from "../assets/25-fotor.png";

type Category = "Candy" | "Thrift" | "Jewelry" | "Books" | "Crafts" | "Clothes";

type Item = {
  id: string;
  name: string;
  price: number;
};

type LineItem = {
  label: string; // SIMPLE: category name or item name
  amount: number;
};

type CategoryConfig = {
  items?: Item[];              // fixed item buttons
  quickPrices?: number[];      // quick price tiles
  allowCustomPrice?: boolean;  // custom amount input
};

const CATEGORIES: Category[] = ["Candy", "Thrift", "Jewelry", "Books", "Crafts", "Clothes"];

// ✅ EDIT THIS: put your real items/prices here
const CATEGORY_CONFIG: Record<Category, CategoryConfig> = {
  Candy: {
    items: [
      { id: "c-1", name: "Sour Gummies", price: 2.99 },
      { id: "c-2", name: "Chocolate Bar", price: 1.99 },
      { id: "c-3", name: "Lollipop", price: 0.5 },
    ],
    quickPrices: [0.5, 1, 2, 5],
  },
  Thrift: {
    quickPrices: [1, 2, 3, 5, 10, 20],
    allowCustomPrice: true,
  },
  Jewelry: {
    items: [
      { id: "j-1", name: "Ring", price: 12 },
      { id: "j-2", name: "Necklace", price: 18 },
    ],
    quickPrices: [5, 10, 20, 30, 50],
    allowCustomPrice: true,
  },
  Books: {
    items: [
      { id: "b-1", name: "Paperback", price: 4 },
      { id: "b-2", name: "Hardcover", price: 8 },
    ],
    quickPrices: [1, 2, 4, 5, 8, 10],
    allowCustomPrice: true,
  },
  Crafts: {
    items: [{ id: "cr-1", name: "Handmade Item", price: 10 }],
    quickPrices: [5, 10, 15, 20, 25, 30],
    allowCustomPrice: true,
  },
  Clothes: {
    quickPrices: [5, 8, 10, 15, 20, 25],
    allowCustomPrice: true,
  },
};

const TAX_RATE = 0.14;

const POS: React.FC = () => {
  const [category, setCategory] = useState<Category>("Candy");
  const [search, setSearch] = useState("");

  const [lines, setLines] = useState<LineItem[]>([]);
  const [taxEnabled, setTaxEnabled] = useState(true);

  const [sales, setSales] = useState<Sale[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const [showPayModal, setShowPayModal] = useState(false);
  const [amountTendered, setAmountTendered] = useState("0.00");
  const [changeDue, setChangeDue] = useState<number | null>(null);

  const [customPrice, setCustomPrice] = useState("");
  const [pulseKey, setPulseKey] = useState<string | null>(null);

  const denominations = useMemo(
    () => [
      { value: 20, imageUrl: bill20Url },
      { value: 10, imageUrl: bill10Url },
      { value: 5, imageUrl: bill5Url },
      { value: 2, imageUrl: bill2Url },
      { value: 1, imageUrl: bill1Url },
      { value: 0.25, imageUrl: coin25Url },
    ],
    []
  );

  // Load / save sales
  useEffect(() => {
    const savedSales = localStorage.getItem("yard-sale-pos-sales");
    if (savedSales) setSales(JSON.parse(savedSales));
  }, []);

  useEffect(() => {
    localStorage.setItem("yard-sale-pos-sales", JSON.stringify(sales));
  }, [sales]);

  const currentTotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.amount, 0),
    [lines]
  );

  const totalSales = useMemo(
    () => sales.reduce((sum, s) => sum + s.total, 0),
    [sales]
  );

  const cfg = CATEGORY_CONFIG[category];

  const fixedItems = useMemo(() => {
    const list = cfg.items ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((it) => it.name.toLowerCase().includes(q));
  }, [cfg.items, search]);

  const addLine = (label: string, amount: number) => {
    if (!amount || amount <= 0) return;
    setLines((prev) => [...prev, { label, amount }]);
  };

  const undoLast = () => setLines((prev) => prev.slice(0, -1));

  const clearSale = () => {
    setLines([]);
    setSearch("");
    setCustomPrice("");
    setShowPayModal(false);
    setAmountTendered("0.00");
    setChangeDue(null);
  };

  const completeSale = () => {
    if (currentTotal <= 0) return;
    const newSale: Sale = { id: Date.now(), timestamp: new Date(), total: currentTotal };
    setSales((prev) => [newSale, ...prev]);
    clearSale();
  };

  const clearAllSales = () => {
    if (confirm("Are you sure you want to clear all sales history?")) setSales([]);
  };

  const refund = (saleId: number) => {
    const sale = sales.find((s) => s.id === saleId);
    if (sale && confirm(`Refund ${formatCurrency(sale.total)}?`)) {
      setSales((prev) => prev.filter((s) => s.id !== saleId));
    }
  };

  const calculateTaxBreakdown = (total: number) => {
    if (!taxEnabled) return { subtotal: total, tax: 0, total };
    const subtotal = total / (1 + TAX_RATE);
    const tax = total - subtotal;
    return { subtotal, tax, total };
  };

  const breakdown = calculateTaxBreakdown(currentTotal);

  return (
    <div className="h-dvh bg-gray-50">
      {/* Top bar */}
      <div className="px-3 sm:px-4 py-3 flex items-center justify-between border-b bg-white">
        <div className="min-w-0">
          <div className="text-sm text-gray-500">Quick POS</div>
          <div className="text-base font-semibold truncate">Canadian Beats Marketplace</div>
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

      {/* Main */}
      <div className="h-[calc(100dvh-56px)] grid grid-rows-[1fr_auto]">
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-3 p-3 sm:p-4 overflow-hidden">
          {/* Categories */}
          <aside className="bg-white rounded-2xl border p-2 md:p-3 overflow-auto">
            <div className="text-xs font-semibold text-gray-500 px-2 py-2">Categories</div>

            <div className="grid grid-cols-3 md:grid-cols-1 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setCategory(c);
                    setSearch("");
                    setCustomPrice("");
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
              Total Sales Today:{" "}
              <span className="font-semibold text-gray-700">{formatCurrency(totalSales)}</span>
            </div>
          </aside>

          {/* Items */}
          <main className="bg-white rounded-2xl border p-3 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs text-gray-500">Items</div>
                <div className="text-lg font-semibold">{category}</div>
              </div>

              {(cfg.items?.length ?? 0) > 0 && (
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search items…"
                  className="w-[min(420px,60%)] px-3 py-2 rounded-xl border bg-gray-50 focus:bg-white outline-none"
                />
              )}
            </div>

            {/* Quick Prices */}
            {cfg.quickPrices?.length ? (
              <div className="mt-3">
                <div className="text-xs font-semibold text-gray-500 mb-2">Quick Prices</div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {cfg.quickPrices.map((p) => (
                    <button
                      key={p}
                      onClick={() => addLine(category, p)} // SIMPLE label
                      className="rounded-2xl border bg-gray-50 hover:bg-gray-100 p-4 font-extrabold text-lg"
                    >
                      {formatCurrency(p)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Custom Price (simple) */}
            {cfg.allowCustomPrice ? (
              <div className="mt-3 rounded-2xl border bg-gray-50 p-3">
                <div className="text-xs font-semibold text-gray-500 mb-2">Custom Price</div>

                <div className="grid grid-cols-[1fr_160px] gap-2">
                  <input
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value.replace(/[^\d.]/g, ""))}
                    placeholder="0.00"
                    inputMode="decimal"
                    className="px-3 py-3 rounded-xl border bg-white text-right font-semibold text-lg"
                  />
                  <button
                    onClick={() => {
                      const amt = Number(customPrice);
                      if (!amt || amt <= 0) return;
                      addLine(category, amt); // SIMPLE label
                      setCustomPrice("");
                    }}
                    className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg"
                  >
                    Add
                  </button>
                </div>
              </div>
            ) : null}

            {/* Fixed Items Grid */}
            {(cfg.items?.length ?? 0) > 0 && (
              <div className="mt-3 overflow-auto">
                <div className="text-xs font-semibold text-gray-500 mb-2">Items</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                  {fixedItems.map((it) => (
                    <button
                      key={it.id}
                      onClick={() => addLine(it.name, it.price)}
                      className="rounded-2xl border bg-gray-50 hover:bg-gray-100 active:scale-[0.99] transition p-4 text-left min-h-[92px]"
                    >
                      <div className="font-semibold text-base">{it.name}</div>
                      <div className="text-sm text-gray-600 mt-1">{formatCurrency(it.price)}</div>
                    </button>
                  ))}

                  {fixedItems.length === 0 && (
                    <div className="col-span-full text-center text-gray-500 py-10">No items found.</div>
                  )}
                </div>
              </div>
            )}
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

              {lines.length > 0 && (
                <div className="text-xs text-gray-500 truncate max-w-[65vw]">
                  {lines.map((l) => `${l.label} ${formatCurrency(l.amount)}`).join(" + ")}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={undoLast}
                disabled={lines.length === 0}
                className={[
                  "px-3 py-3 rounded-xl font-semibold border flex items-center gap-2",
                  lines.length === 0
                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                    : "bg-white hover:bg-gray-50 text-gray-800 border-gray-200",
                ].join(" ")}
              >
                <Trash2 className="w-4 h-4" />
                Undo
              </button>

              <button
                onClick={() => {
                  if (currentTotal <= 0) return;
                  setShowPayModal(true);
                  setAmountTendered("0.00");
                  setChangeDue(null);
                }}
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

      {/* Pay modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border p-4 relative">
            <button
              onClick={() => setShowPayModal(false)}
              className="absolute top-3 right-3 p-2 rounded-lg hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>

            <div className="text-lg font-bold">Sale Total</div>
            <div className="mt-2 text-2xl font-extrabold">{formatCurrency(currentTotal)}</div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {denominations.map((denom) => (
                <PriceButton
                  key={denom.value}
                  value={denom.value}
                  imageUrl={denom.imageUrl}
                  onClick={() => {
                    setPulseKey(String(denom.value));
                    setTimeout(() => setPulseKey(null), 250);
                    const newAmount = parseFloat(amountTendered) + denom.value;
                    setAmountTendered(newAmount.toFixed(2));
                    setChangeDue(newAmount - currentTotal);
                  }}
                  isPulsing={pulseKey === String(denom.value)}
                />
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between text-sm">
              <div>
                Tendered: <span className="font-semibold">${amountTendered}</span>
              </div>

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
                onClick={() => setShowPayModal(false)}
                className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  completeSale();
                  setShowPayModal(false);
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
            <SalesHistory sales={sales} onClearAll={clearAllSales} onRefund={refund} totalSales={totalSales} />
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
