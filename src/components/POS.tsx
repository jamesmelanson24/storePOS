import React, { useEffect, useMemo, useState } from "react";
import { X, Trash2, PackagePlus, Minus, Plus, Pencil } from "lucide-react";
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
  stock: number; // ✅ inventory
};

type LineItem = {
  label: string; // simple: category name or item name
  amount: number;
};

type CategoryConfig = {
  quickPrices?: number[];      // quick price tiles
  allowCustomPrice?: boolean;  // custom amount input
  trackStock?: boolean;        // only for fixed item grids
};

const CATEGORIES: Category[] = ["Candy", "Thrift", "Jewelry", "Books", "Crafts", "Clothes"];

const CAT_STYLES: Record<Category, { active: string; idle: string }> = {
  Candy:   { active: "bg-pink-600 text-white border-pink-600",   idle: "bg-pink-50 border-pink-200 text-pink-800 hover:bg-pink-100" },
  Thrift:  { active: "bg-amber-600 text-white border-amber-600", idle: "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100" },
  Jewelry: { active: "bg-purple-600 text-white border-purple-600", idle: "bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100" },
  Books:   { active: "bg-blue-600 text-white border-blue-600",   idle: "bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100" },
  Crafts:  { active: "bg-emerald-600 text-white border-emerald-600", idle: "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100" },
  Clothes: { active: "bg-slate-700 text-white border-slate-700", idle: "bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100" },
};

const CATEGORY_CONFIG: Record<Category, CategoryConfig> = {
  Candy:   { quickPrices: [0.5, 1, 2, 5], trackStock: true },
  Thrift:  { quickPrices: [1, 2, 3, 5, 10, 20], allowCustomPrice: true, trackStock: false },
  Jewelry: { quickPrices: [5, 10, 20, 30, 50], allowCustomPrice: true, trackStock: true },
  Books:   { quickPrices: [1, 2, 4, 5, 8, 10], allowCustomPrice: true, trackStock: true },
  Crafts:  { quickPrices: [5, 10, 15, 20, 25, 30], allowCustomPrice: true, trackStock: true },
  Clothes: { quickPrices: [5, 8, 10, 15, 20, 25], allowCustomPrice: true, trackStock: false },
};

// ✅ EDIT THIS: your real inventory (fixed items) lives here
const DEFAULT_INVENTORY: Record<Category, Item[]> = {
  Candy: [
    { id: "c-1", name: "Sour Gummies", price: 2.99, stock: 24 },
    { id: "c-2", name: "Chocolate Bar", price: 1.99, stock: 12 },
    { id: "c-3", name: "Lollipop", price: 0.5, stock: 50 },
  ],
  Thrift: [],
  Jewelry: [
    { id: "j-1", name: "Ring", price: 12, stock: 6 },
    { id: "j-2", name: "Necklace", price: 18, stock: 4 },
  ],
  Books: [
    { id: "b-1", name: "Paperback", price: 4, stock: 20 },
    { id: "b-2", name: "Hardcover", price: 8, stock: 10 },
  ],
  Crafts: [{ id: "cr-1", name: "Handmade Item", price: 10, stock: 8 }],
  Clothes: [],
};

const INVENTORY_KEY = "pos-inventory-v1";
const SALES_KEY = "yard-sale-pos-sales";
const TAX_RATE = 0.14;

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

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

  // ✅ Inventory state
  const [inventory, setInventory] = useState<Record<Category, Item[]>>(deepClone(DEFAULT_INVENTORY));
  const [showInventory, setShowInventory] = useState(false);

  // New item form
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newStock, setNewStock] = useState("");

  // Load sales + inventory
  useEffect(() => {
    const savedSales = localStorage.getItem(SALES_KEY);
    if (savedSales) setSales(JSON.parse(savedSales));

    const savedInv = localStorage.getItem(INVENTORY_KEY);
    if (savedInv) setInventory(JSON.parse(savedInv));
  }, []);

  // Save sales + inventory
  useEffect(() => {
    localStorage.setItem(SALES_KEY, JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory));
  }, [inventory]);

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

  const currentTotal = useMemo(() => lines.reduce((sum, l) => sum + l.amount, 0), [lines]);
  const totalSales = useMemo(() => sales.reduce((sum, s) => sum + s.total, 0), [sales]);

  const cfg = CATEGORY_CONFIG[category];
  const itemsInCategory = inventory[category] ?? [];

  const fixedItems = useMemo(() => {
    const list = cfg.trackStock ? itemsInCategory : [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((it) => it.name.toLowerCase().includes(q));
  }, [cfg.trackStock, itemsInCategory, search]);

  const addLine = (label: string, amount: number) => {
    if (!amount || amount <= 0) return;
    setLines((prev) => [...prev, { label, amount }]);
  };

  const addFixedItem = (itemId: string) => {
    const list = inventory[category] ?? [];
    const idx = list.findIndex((x) => x.id === itemId);
    if (idx < 0) return;

    const item = list[idx];

    // hard stop when out of stock
    if (cfg.trackStock && item.stock <= 0) return;

    addLine(item.name, item.price);

    if (cfg.trackStock) {
      const next = [...list];
      next[idx] = { ...item, stock: item.stock - 1 };
      setInventory((prev) => ({ ...prev, [category]: next }));
    }
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

  // Inventory helpers
  const bumpStock = (itemId: string, delta: number) => {
    setInventory((prev) => {
      const list = prev[category] ?? [];
      const idx = list.findIndex((x) => x.id === itemId);
      if (idx < 0) return prev;
      const item = list[idx];
      const next = [...list];
      next[idx] = { ...item, stock: Math.max(0, item.stock + delta) };
      return { ...prev, [category]: next };
    });
  };

  const setItemField = (itemId: string, field: "name" | "price" | "stock", value: string) => {
    setInventory((prev) => {
      const list = prev[category] ?? [];
      const idx = list.findIndex((x) => x.id === itemId);
      if (idx < 0) return prev;
      const item = list[idx];
      const next = [...list];

      if (field === "name") next[idx] = { ...item, name: value };
      if (field === "price") next[idx] = { ...item, price: Number(value) || 0 };
      if (field === "stock") next[idx] = { ...item, stock: Math.max(0, Number(value) || 0) };

      return { ...prev, [category]: next };
    });
  };

  const addNewItem = () => {
    const name = newName.trim();
    const price = Number(newPrice);
    const stock = Number(newStock);

    if (!name) return;
    if (!price || price <= 0) return;
    if (cfg.trackStock !== true) return; // only allow adding to inventory-tracked categories

    const item: Item = {
      id: makeId(category[0].toLowerCase()),
      name,
      price,
      stock: Math.max(0, stock || 0),
    };

    setInventory((prev) => ({
      ...prev,
      [category]: [...(prev[category] ?? []), item],
    }));

    setNewName("");
    setNewPrice("");
    setNewStock("");
  };

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
            onClick={() => setShowInventory(true)}
            className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-semibold flex items-center gap-2"
          >
            <PackagePlus className="w-4 h-4" />
            Inventory
          </button>

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
              {CATEGORIES.map((c) => {
                const s = CAT_STYLES[c];
                const cls = c === category ? s.active : s.idle;

                return (
                  <button
                    key={c}
                    onClick={() => {
                      setCategory(c);
                      setSearch("");
                      setCustomPrice("");
                    }}
                    className={["rounded-xl px-3 py-3 font-semibold text-sm md:text-base border transition", cls].join(" ")}
                  >
                    {c}
                  </button>
                );
              })}
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

              {cfg.trackStock && (
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
                      onClick={() => addLine(category, p)} // simple label
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
                      addLine(category, amt);
                      setCustomPrice("");
                    }}
                    className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg"
                  >
                    Add
                  </button>
                </div>
              </div>
            ) : null}

            {/* Fixed Items (with stock) */}
            {cfg.trackStock && (
              <div className="mt-3 overflow-auto">
                <div className="text-xs font-semibold text-gray-500 mb-2">Items</div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                  {fixedItems.map((it) => {
                    const out = it.stock <= 0;
                    return (
                      <button
                        key={it.id}
                        onClick={() => addFixedItem(it.id)}
                        disabled={out}
                        className={[
                          "rounded-2xl border active:scale-[0.99] transition p-4 text-left min-h-[98px]",
                          out
                            ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                            : "bg-gray-50 hover:bg-gray-100 border-gray-200",
                        ].join(" ")}
                      >
                        <div className="font-semibold text-base">{it.name}</div>
                        <div className="text-sm text-gray-600 mt-1">{formatCurrency(it.price)}</div>
                        <div className={["text-xs mt-2", out ? "text-rose-600" : "text-gray-500"].join(" ")}>
                          Stock: {it.stock}
                        </div>
                      </button>
                    );
                  })}

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
                  changeDue !== null && changeDue >= 0 ? "bg-emerald-600 hover:bg-emerald-700" : "bg-gray-400 cursor-not-allowed",
                ].join(" ")}
              >
                Complete Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inventory modal */}
      {showInventory && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl border p-4 relative">
            <button
              onClick={() => setShowInventory(false)}
              className="absolute top-3 right-3 p-2 rounded-lg hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>

            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-bold">Inventory</div>
                <div className="text-sm text-gray-500">
                  Editing: <span className="font-semibold">{category}</span>{" "}
                  {cfg.trackStock ? "" : "(This category uses quick/custom pricing — no item stock list.)"}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setInventory(deepClone(DEFAULT_INVENTORY));
                  }}
                  className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-semibold"
                >
                  Reset Inventory
                </button>
              </div>
            </div>

            {!cfg.trackStock ? (
              <div className="mt-6 text-gray-600">
                For <span className="font-semibold">{category}</span>, you’re using quick prices + custom prices — which is perfect for random items.
                <div className="mt-2 text-sm text-gray-500">
                  If you *do* want tracked items here later, tell me and we’ll flip trackStock on and add items.
                </div>
              </div>
            ) : (
              <>
                {/* Add new item */}
                <div className="mt-4 rounded-2xl border bg-gray-50 p-3">
                  <div className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-2">
                    <PackagePlus className="w-4 h-4" /> Add Item
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[1fr_160px_160px_140px] gap-2">
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Item name"
                      className="px-3 py-3 rounded-xl border bg-white"
                    />
                    <input
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value.replace(/[^\d.]/g, ""))}
                      placeholder="Price"
                      inputMode="decimal"
                      className="px-3 py-3 rounded-xl border bg-white text-right font-semibold"
                    />
                    <input
                      value={newStock}
                      onChange={(e) => setNewStock(e.target.value.replace(/[^\d]/g, ""))}
                      placeholder="Stock"
                      inputMode="numeric"
                      className="px-3 py-3 rounded-xl border bg-white text-right font-semibold"
                    />
                    <button
                      onClick={addNewItem}
                      className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Item list */}
                <div className="mt-4 overflow-auto max-h-[60vh]">
                  <div className="grid grid-cols-1 gap-2">
                    {(inventory[category] ?? []).map((it) => (
                      <div key={it.id} className="rounded-2xl border p-3 flex flex-col md:flex-row md:items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-500 flex items-center gap-2">
                            <Pencil className="w-4 h-4" />
                            Edit item
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_180px] gap-2 mt-2">
                            <input
                              value={it.name}
                              onChange={(e) => setItemField(it.id, "name", e.target.value)}
                              className="px-3 py-2 rounded-xl border"
                            />
                            <input
                              value={String(it.price)}
                              onChange={(e) => setItemField(it.id, "price", e.target.value.replace(/[^\d.]/g, ""))}
                              inputMode="decimal"
                              className="px-3 py-2 rounded-xl border text-right font-semibold"
                            />
                            <input
                              value={String(it.stock)}
                              onChange={(e) => setItemField(it.id, "stock", e.target.value.replace(/[^\d]/g, ""))}
                              inputMode="numeric"
                              className="px-3 py-2 rounded-xl border text-right font-semibold"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => bumpStock(it.id, -1)}
                            className="px-3 py-3 rounded-xl border bg-gray-50 hover:bg-gray-100"
                            aria-label="Decrease stock"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => bumpStock(it.id, +1)}
                            className="px-3 py-3 rounded-xl border bg-gray-50 hover:bg-gray-100"
                            aria-label="Increase stock"
                          >
                            <Plus className="w-4 h-4" />
                          </button>

                          <div className="px-3 py-2 rounded-xl bg-gray-50 border text-sm font-semibold">
                            {formatCurrency(it.price)} · Stock {it.stock}
                          </div>
                        </div>
                      </div>
                    ))}

                    {(inventory[category] ?? []).length === 0 && (
                      <div className="text-center text-gray-500 py-10">No items yet. Add one above.</div>
                    )}
                  </div>
                </div>
              </>
            )}
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
