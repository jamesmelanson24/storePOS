import React, { useEffect, useMemo, useState } from "react";
import {
  X,
  Trash2,
  PackagePlus,
  Minus,
  Plus,
  Pencil,
  Moon,
  Sun,
  ClipboardCheck,
  Download,
} from "lucide-react";
import PriceButton from "./PriceButton";
import SalesHistory from "./SalesHistory";
import { Sale, PaymentType } from "../types";
import { formatCurrency } from "../utils/formatters";
import { utils, writeFile } from "xlsx";

import bill20Url from "../assets/20-fotor.png";
import bill10Url from "../assets/10-fotor.png";
import bill5Url from "../assets/5-fotor.png";
import bill2Url from "../assets/2-fotor.png";
import bill1Url from "../assets/1-fotor.png";
import coin25Url from "../assets/25-fotor.png";

type Category =
  | "Candy"
  | "Thrift"
  | "Pet"
  | "Music"
  | "Books"
  | "Crafts"
  | "Sunset Gourmet";

type Item = {
  id: string;
  name: string;
  price: number;
  stock: number;
};

type LineItem = {
  category: Category;
  label: string;
  unitAmount: number;
  qty: number;
};

type CategoryConfig = {
  quickPrices?: number[];
  allowCustomPrice?: boolean;
  trackStock?: boolean;
};

const CATEGORIES: Category[] = [
  "Candy",
  "Thrift",
  "Pet",
  "Music",
  "Books",
  "Crafts",
  "Sunset Gourmet",
];

const QUICK_PRICES = [0.25, 1, 5, 10];

const QUICK_PRICE_STYLES: Record<number, string> = {
  0.25: "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700",
  1: "bg-blue-600 hover:bg-blue-700 text-white border-blue-700",
  5: "bg-violet-600 hover:bg-violet-700 text-white border-violet-700",
  10: "bg-rose-600 hover:bg-rose-700 text-white border-rose-700",
};

const formatQuickPrice = (value: number) =>
  value < 1 ? `${Math.round(value * 100)}¢` : formatCurrency(value);

const CAT_STYLES: Record<Category, { active: string; idle: string }> = {
  Candy: {
    active: "bg-pink-600 text-white border-pink-600",
    idle: "bg-pink-50 border-pink-200 text-pink-800 hover:bg-pink-100",
  },
  Thrift: {
    active: "bg-amber-600 text-white border-amber-600",
    idle: "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100",
  },
  Pet: {
    active: "bg-lime-600 text-white border-lime-600",
    idle: "bg-lime-50 border-lime-200 text-lime-800 hover:bg-lime-100",
  },
  Music: {
    active: "bg-indigo-600 text-white border-indigo-600",
    idle: "bg-indigo-50 border-indigo-200 text-indigo-800 hover:bg-indigo-100",
  },
  Books: {
    active: "bg-blue-600 text-white border-blue-600",
    idle: "bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100",
  },
  Crafts: {
    active: "bg-emerald-600 text-white border-emerald-600",
    idle: "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100",
  },
  "Sunset Gourmet": {
    active: "bg-orange-600 text-white border-orange-600",
    idle: "bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100",
  },
};

const CATEGORY_CONFIG: Record<Category, CategoryConfig> = {
  Candy: { quickPrices: QUICK_PRICES, trackStock: true },
  Thrift: { quickPrices: QUICK_PRICES, allowCustomPrice: true, trackStock: false },
  Pet: { quickPrices: QUICK_PRICES, allowCustomPrice: true, trackStock: true },
  Music: { quickPrices: QUICK_PRICES, allowCustomPrice: true, trackStock: true },
  Books: { quickPrices: QUICK_PRICES, allowCustomPrice: true, trackStock: true },
  Crafts: { quickPrices: QUICK_PRICES, allowCustomPrice: true, trackStock: true },

  // ✅ NOW includes quick prices + custom price
  "Sunset Gourmet": { quickPrices: QUICK_PRICES, allowCustomPrice: true, trackStock: false },
};

// starting inventory
const DEFAULT_INVENTORY: Record<Category, Item[]> = {
  Candy: [
    { id: "c-1", name: "Sour Gummies", price: 2.99, stock: 24 },
    { id: "c-2", name: "Chocolate Bar", price: 1.99, stock: 12 },
    { id: "c-3", name: "Lollipop", price: 0.5, stock: 50 },
  ],
  Thrift: [],
  Pet: [
    { id: "p-1", name: "Dog Treats", price: 4.99, stock: 10 },
    { id: "p-2", name: "Cat Toy", price: 3.5, stock: 12 },
  ],
  Music: [
    { id: "m-1", name: "Guitar Picks", price: 1.5, stock: 30 },
    { id: "m-2", name: "CD", price: 5, stock: 15 },
  ],
  Books: [
    { id: "b-1", name: "Paperback", price: 4, stock: 20 },
    { id: "b-2", name: "Hardcover", price: 8, stock: 10 },
  ],
  Crafts: [{ id: "cr-1", name: "Handmade Item", price: 10, stock: 8 }],
  "Sunset Gourmet": [],
};

const INVENTORY_KEY = "pos-inventory-v4";
const SALES_KEY = "yard-sale-pos-sales-v2";
const UI_KEY = "pos-ui-v1";
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
  const [paymentType, setPaymentType] = useState<PaymentType>("cash");
  const [amountTendered, setAmountTendered] = useState("0.00");
  const [changeDue, setChangeDue] = useState<number | null>(null);

  const [customPrice, setCustomPrice] = useState("");
  const [pulseKey, setPulseKey] = useState<string | null>(null);

  const [inventory, setInventory] = useState<Record<Category, Item[]>>(deepClone(DEFAULT_INVENTORY));
  const [showInventory, setShowInventory] = useState(false);

  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newStock, setNewStock] = useState("");

  const [darkMode, setDarkMode] = useState(false);
  const [showCloseRegister, setShowCloseRegister] = useState(false);

  useEffect(() => {
    const savedSales = localStorage.getItem(SALES_KEY);
    if (savedSales) setSales(JSON.parse(savedSales));

    const savedInv = localStorage.getItem(INVENTORY_KEY);
    if (savedInv) setInventory(JSON.parse(savedInv));

    const savedUi = localStorage.getItem(UI_KEY);
    if (savedUi) {
      try {
        const ui = JSON.parse(savedUi);
        if (typeof ui.darkMode === "boolean") setDarkMode(ui.darkMode);
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(SALES_KEY, JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem(UI_KEY, JSON.stringify({ darkMode }));
  }, [darkMode]);

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

  const currentTotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.unitAmount * l.qty, 0),
    [lines]
  );

  const cfg = CATEGORY_CONFIG[category];
  const itemsInCategory = inventory[category] ?? [];

  const fixedItems = useMemo(() => {
    const list = cfg.trackStock ? itemsInCategory : [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((it) => it.name.toLowerCase().includes(q));
  }, [cfg.trackStock, itemsInCategory, search]);

  const toDateObj = (d: Date | string) => (d instanceof Date ? d : new Date(d));
  const isSameLocalDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const todaySales = useMemo(() => {
    const today = new Date();
    return sales.filter((s) => isSameLocalDay(toDateObj(s.timestamp), today));
  }, [sales]);

  const todayTotal = useMemo(
    () => todaySales.reduce((sum, s) => sum + (s.total ?? 0), 0),
    [todaySales]
  );

  const todayPaymentTotals = useMemo(() => {
    const out: Record<PaymentType, number> = { cash: 0, card: 0 };
    for (const s of todaySales) {
      const pt = (s.paymentType ?? "cash") as PaymentType;
      out[pt] += s.total ?? 0;
    }
    return out;
  }, [todaySales]);

  const todayCategoryTotals = useMemo(() => {
    const totals: Record<Category, number> = {
      Candy: 0,
      Thrift: 0,
      Pet: 0,
      Music: 0,
      Books: 0,
      Crafts: 0,
      "Sunset Gourmet": 0,
    };

    for (const s of todaySales) {
      for (const ln of s.lines ?? []) {
        const cat = (ln.category ?? "") as Category;
        const amt = (ln.unitAmount ?? 0) * (ln.qty ?? 1);
        if (totals[cat] !== undefined) totals[cat] += amt;
      }
    }
    return totals;
  }, [todaySales]);

  const todayItemCounts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const s of todaySales) {
      for (const ln of s.lines ?? []) {
        const key = `${ln.category}::${ln.label}::${ln.unitAmount}`;
        const prev = map.get(key);
        const qty = ln.qty ?? 1;
        const revenue = (ln.unitAmount ?? 0) * qty;
        if (!prev) map.set(key, { name: `${ln.category}: ${ln.label}`, qty, revenue });
        else map.set(key, { name: prev.name, qty: prev.qty + qty, revenue: prev.revenue + revenue });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [todaySales]);

  const addLine = (label: string, unitAmount: number) => {
    if (!unitAmount || unitAmount <= 0) return;

    setLines((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.category === category && last.label === label && last.unitAmount === unitAmount) {
        const next = [...prev];
        next[next.length - 1] = { ...last, qty: last.qty + 1 };
        return next;
      }
      return [...prev, { category, label, unitAmount, qty: 1 }];
    });
  };

  const addFixedItem = (itemId: string) => {
    const list = inventory[category] ?? [];
    const idx = list.findIndex((x) => x.id === itemId);
    if (idx < 0) return;

    const item = list[idx];
    if (cfg.trackStock && item.stock <= 0) return;

    addLine(item.name, item.price);

    if (cfg.trackStock) {
      const next = [...list];
      next[idx] = { ...item, stock: item.stock - 1 };
      setInventory((prev) => ({ ...prev, [category]: next }));
    }
  };

  const undoLast = () => {
    setLines((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.qty > 1) {
        const next = [...prev];
        next[next.length - 1] = { ...last, qty: last.qty - 1 };
        return next;
      }
      return prev.slice(0, -1);
    });
  };

  const clearSale = () => {
    setLines([]);
    setSearch("");
    setCustomPrice("");
    setShowPayModal(false);
    setPaymentType("cash");
    setAmountTendered("0.00");
    setChangeDue(null);
  };

  const completeSale = () => {
    if (currentTotal <= 0) return;

    const newSale: Sale = {
      id: Date.now(),
      timestamp: new Date(),
      total: currentTotal,
      paymentType,
      lines: lines.map((l) => ({
        category: l.category,
        label: l.label,
        unitAmount: l.unitAmount,
        qty: l.qty,
      })),
    };

    setSales((prev) => [newSale, ...prev]);
    clearSale();
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

    if (!cfg.trackStock) return;
    if (!name) return;
    if (!price || price <= 0) return;

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

  const clearTodaySales = () => {
    const today = new Date();
    setSales((prev) => prev.filter((s) => !isSameLocalDay(toDateObj(s.timestamp), today)));
  };

  const exportCloseRegister = () => {
    const today = new Date();
    const dateString = today.toISOString().split("T")[0];
    const filename = `close-register-${dateString}.xlsx`;

    // Sheet: Summary
    const summaryRows = [
      { Metric: "Date", Value: today.toLocaleDateString() },
      { Metric: "Transactions", Value: todaySales.length },
      { Metric: "Total Sales", Value: Number(todayTotal.toFixed(2)) },
      { Metric: "Cash Total", Value: Number(todayPaymentTotals.cash.toFixed(2)) },
      { Metric: "Card Total", Value: Number(todayPaymentTotals.card.toFixed(2)) },
      { Metric: "Avg Sale", Value: Number((todaySales.length ? todayTotal / todaySales.length : 0).toFixed(2)) },
    ];

    // Sheet: Category totals
    const categoryRows = CATEGORIES.map((c) => ({
      Category: c,
      Total: Number((todayCategoryTotals[c] ?? 0).toFixed(2)),
    })).filter((r) => r.Total > 0);

    // Sheet: Item counts
    const itemRows = todayItemCounts.map((x) => ({
      Item: x.name,
      Qty: x.qty,
      Revenue: Number(x.revenue.toFixed(2)),
    }));

    const wb = utils.book_new();
    utils.book_append_sheet(wb, utils.json_to_sheet(summaryRows), "Summary");
    utils.book_append_sheet(wb, utils.json_to_sheet(categoryRows), "Category Totals");
    utils.book_append_sheet(wb, utils.json_to_sheet(itemRows), "Item Counts");
    writeFile(wb, filename);

    const shouldClear = window.confirm("Close Register exported. Clear TODAY'S sales now?");
    if (shouldClear) clearTodaySales();
  };

  const shellClass = darkMode ? "dark" : "";

  return (
    <div className={shellClass}>
      <div className="h-dvh bg-gray-50 text-gray-900 dark:bg-slate-950 dark:text-slate-100">
        {/* Top bar */}
        <div className="px-3 sm:px-4 py-3 flex items-center justify-between border-b bg-white dark:bg-slate-900 dark:border-slate-800">
          <div className="min-w-0">
            <div className="text-sm text-gray-500 dark:text-slate-400">Quick POS</div>
            <div className="text-base font-semibold truncate">Canadian Beats Marketplace</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDarkMode((v) => !v)}
              className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-semibold flex items-center gap-2 dark:bg-slate-800 dark:hover:bg-slate-700"
              title="Toggle dark mode"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {darkMode ? "Light" : "Dark"}
            </button>

            <button
              onClick={() => setShowCloseRegister(true)}
              className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-semibold flex items-center gap-2 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              <ClipboardCheck className="w-4 h-4" />
              Close Register
            </button>

            <button
              onClick={() => setShowInventory(true)}
              className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-semibold flex items-center gap-2 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              <PackagePlus className="w-4 h-4" />
              Inventory
            </button>

            <button
              onClick={() => setShowHistory(true)}
              className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-semibold dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              History
            </button>

            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 px-3 py-2 rounded-lg bg-gray-100 dark:bg-slate-800 dark:text-slate-200">
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
          <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-3 p-3 sm:p-4 overflow-hidden">
            {/* Categories */}
            <aside className="bg-white rounded-2xl border p-2 md:p-3 overflow-auto dark:bg-slate-900 dark:border-slate-800">
              <div className="text-xs font-semibold text-gray-500 dark:text-slate-400 px-2 py-2">
                Categories
              </div>

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
                      className={[
                        "rounded-xl px-3 py-3 font-semibold text-sm md:text-base border transition",
                        cls,
                        "dark:border-slate-800",
                      ].join(" ")}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>

              {/* TODAY totals */}
              <div className="mt-4 px-2 py-2 text-xs text-gray-500 dark:text-slate-400">
                <div className="flex items-center justify-between">
                  <span>Total Sales Today:</span>
                  <span className="font-semibold text-gray-700 dark:text-slate-200">
                    {formatCurrency(todayTotal)}
                  </span>
                </div>

                <div className="mt-2 grid gap-1">
                  {CATEGORIES.map((c) => {
                    const amt = todayCategoryTotals[c] ?? 0;
                    if (amt <= 0) return null;
                    return (
                      <div key={c} className="flex items-center justify-between">
                        <span className="truncate">{c}</span>
                        <span className="font-semibold text-gray-700 dark:text-slate-200">
                          {formatCurrency(amt)}
                        </span>
                      </div>
                    );
                  })}
                  {CATEGORIES.every((c) => (todayCategoryTotals[c] ?? 0) === 0) && (
                    <div className="italic">No sales yet today</div>
                  )}
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <span>Cash:</span>
                  <span className="font-semibold text-gray-700 dark:text-slate-200">
                    {formatCurrency(todayPaymentTotals.cash)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Card:</span>
                  <span className="font-semibold text-gray-700 dark:text-slate-200">
                    {formatCurrency(todayPaymentTotals.card)}
                  </span>
                </div>
              </div>
            </aside>

            {/* Items */}
            <main className="bg-white rounded-2xl border p-3 overflow-hidden flex flex-col dark:bg-slate-900 dark:border-slate-800">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">Items</div>
                  <div className="text-lg font-semibold">{category}</div>
                </div>

                {cfg.trackStock && (
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search items…"
                    className="w-[min(420px,60%)] px-3 py-2 rounded-xl border bg-gray-50 focus:bg-white outline-none dark:bg-slate-800 dark:border-slate-700 dark:focus:bg-slate-800"
                  />
                )}
              </div>

              {/* Quick Prices */}
              {cfg.quickPrices?.length ? (
                <div className="mt-3">
                  <div className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2">
                    Quick Prices
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {cfg.quickPrices.map((p) => (
                      <button
                        key={p}
                        onClick={() => addLine(category, p)}
                        className={[
                          "rounded-2xl border p-5 font-extrabold text-lg shadow-sm active:scale-[0.98] transition",
                          QUICK_PRICE_STYLES[p] ?? "bg-gray-600 text-white border-gray-700",
                        ].join(" ")}
                      >
                        {formatQuickPrice(p)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Custom Price */}
              {cfg.allowCustomPrice ? (
                <div className="mt-3 rounded-2xl border bg-gray-50 p-3 dark:bg-slate-800 dark:border-slate-700">
                  <div className="text-xs font-semibold text-gray-500 dark:text-slate-300 mb-2">
                    Custom Price
                  </div>

                  <div className="grid grid-cols-[1fr_160px] gap-2">
                    <input
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value.replace(/[^\d.]/g, ""))}
                      placeholder="0.00"
                      inputMode="decimal"
                      className="px-3 py-3 rounded-xl border bg-white text-right font-semibold text-lg dark:bg-slate-900 dark:border-slate-700"
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

              {/* Fixed Items (stock) */}
              {cfg.trackStock && (
                <div className="mt-3 overflow-auto">
                  <div className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2">
                    Items
                  </div>

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
                              ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed dark:bg-slate-800 dark:border-slate-700"
                              : "bg-gray-50 hover:bg-gray-100 border-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700",
                          ].join(" ")}
                        >
                          <div className="font-semibold text-base">{it.name}</div>
                          <div className="text-sm text-gray-600 dark:text-slate-300 mt-1">
                            {formatCurrency(it.price)}
                          </div>
                          <div className={["text-xs mt-2", out ? "text-rose-600" : "text-gray-500 dark:text-slate-400"].join(" ")}>
                            Stock: {it.stock}
                          </div>
                        </button>
                      );
                    })}

                    {fixedItems.length === 0 && (
                      <div className="col-span-full text-center text-gray-500 dark:text-slate-400 py-10">
                        No items found.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </main>
          </div>

          {/* Sticky cart footer */}
          <footer className="sticky bottom-0 bg-white border-t px-3 sm:px-4 py-3 dark:bg-slate-900 dark:border-slate-800">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs text-gray-500 dark:text-slate-400">Current Total</div>
                <div className="text-2xl font-extrabold tracking-tight">
                  {formatCurrency(currentTotal)}
                </div>

                {taxEnabled && currentTotal > 0 && (
                  <div className="text-xs text-gray-500 dark:text-slate-400">
                    Subtotal {formatCurrency(breakdown.subtotal)} + Tax {formatCurrency(breakdown.tax)}
                  </div>
                )}

                {lines.length > 0 && (
                  <div className="text-xs text-gray-500 dark:text-slate-400 truncate max-w-[65vw]">
                    {lines
                      .map((l) => `${l.category}: ${l.label} ${formatCurrency(l.unitAmount)} x${l.qty}`)
                      .join(" • ")}
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
                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed dark:bg-slate-800 dark:border-slate-700"
                      : "bg-white hover:bg-gray-50 text-gray-800 border-gray-200 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-100 dark:border-slate-700",
                  ].join(" ")}
                >
                  <Trash2 className="w-4 h-4" />
                  Undo
                </button>

                <button
                  onClick={() => {
                    if (currentTotal <= 0) return;
                    setShowPayModal(true);
                    setPaymentType("cash");
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border p-4 relative dark:bg-slate-900 dark:border-slate-800">
              <button
                onClick={() => setShowPayModal(false)}
                className="absolute top-3 right-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-slate-300" />
              </button>

              <div className="text-lg font-bold">Sale Total</div>
              <div className="mt-2 text-2xl font-extrabold">{formatCurrency(currentTotal)}</div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPaymentType("cash")}
                  className={[
                    "py-3 rounded-xl font-bold border",
                    paymentType === "cash"
                      ? "bg-blue-600 text-white border-blue-700"
                      : "bg-gray-50 hover:bg-gray-100 border-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700",
                  ].join(" ")}
                >
                  Cash
                </button>

                <button
                  onClick={() => setPaymentType("card")}
                  className={[
                    "py-3 rounded-xl font-bold border",
                    paymentType === "card"
                      ? "bg-slate-800 text-white border-slate-900"
                      : "bg-gray-50 hover:bg-gray-100 border-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700",
                  ].join(" ")}
                >
                  Debit / Credit
                </button>
              </div>

              {paymentType === "cash" ? (
                <>
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
                      className="flex-1 py-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100"
                    >
                      Exact
                    </button>

                    <button
                      onClick={() => {
                        setAmountTendered("0.00");
                        setChangeDue(null);
                      }}
                      className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 font-semibold dark:bg-slate-800 dark:hover:bg-slate-700"
                    >
                      Clear
                    </button>
                  </div>
                </>
              ) : (
                <div className="mt-4 rounded-2xl border bg-gray-50 p-4 text-sm text-gray-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
                  Card payment selected. Take payment on your terminal, then tap <b>Complete Sale</b>.
                </div>
              )}

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setShowPayModal(false)}
                  className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 font-semibold dark:bg-slate-800 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>

                <button
                  onClick={() => {
                    completeSale();
                    setShowPayModal(false);
                  }}
                  disabled={paymentType === "cash" ? changeDue === null || changeDue < 0 : false}
                  className={[
                    "flex-1 py-3 rounded-xl font-semibold text-white",
                    paymentType === "cash"
                      ? changeDue !== null && changeDue >= 0
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-gray-400 cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-700",
                  ].join(" ")}
                >
                  Complete Sale
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Close Register modal */}
        {showCloseRegister && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border p-4 relative dark:bg-slate-900 dark:border-slate-800">
              <button
                onClick={() => setShowCloseRegister(false)}
                className="absolute top-3 right-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-slate-300" />
              </button>

              <div className="text-lg font-bold mb-3">Close Register (Today)</div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-2xl border p-3 bg-gray-50 dark:bg-slate-800 dark:border-slate-700">
                  <div className="text-xs text-gray-500 dark:text-slate-400">Total</div>
                  <div className="text-2xl font-extrabold">{formatCurrency(todayTotal)}</div>
                  <div className="mt-2 text-sm text-gray-600 dark:text-slate-300">
                    Transactions: <b>{todaySales.length}</b>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-300">
                    Avg sale:{" "}
                    <b>{formatCurrency(todaySales.length ? todayTotal / todaySales.length : 0)}</b>
                  </div>
                </div>

                <div className="rounded-2xl border p-3 bg-gray-50 dark:bg-slate-800 dark:border-slate-700">
                  <div className="text-xs text-gray-500 dark:text-slate-400">Payment</div>
                  <div className="mt-2 flex items-center justify-between">
                    <span>Cash</span>
                    <b>{formatCurrency(todayPaymentTotals.cash)}</b>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span>Card</span>
                    <b>{formatCurrency(todayPaymentTotals.card)}</b>
                  </div>
                </div>

                <div className="rounded-2xl border p-3 bg-gray-50 dark:bg-slate-800 dark:border-slate-700">
                  <div className="text-xs text-gray-500 dark:text-slate-400">Actions</div>
                  <button
                    onClick={exportCloseRegister}
                    className="mt-2 w-full px-3 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export Close Register
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Clear TODAY'S sales? This cannot be undone.")) clearTodaySales();
                    }}
                    className="mt-2 w-full px-3 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                  >
                    Clear Today
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-2xl border p-3 dark:border-slate-800">
                  <div className="text-sm font-bold mb-2">Category Totals</div>
                  <div className="grid gap-1 text-sm">
                    {CATEGORIES.map((c) => {
                      const amt = todayCategoryTotals[c] ?? 0;
                      if (amt <= 0) return null;
                      return (
                        <div key={c} className="flex items-center justify-between">
                          <span>{c}</span>
                          <b>{formatCurrency(amt)}</b>
                        </div>
                      );
                    })}
                    {CATEGORIES.every((c) => (todayCategoryTotals[c] ?? 0) === 0) && (
                      <div className="text-gray-500 dark:text-slate-400 italic">No sales today</div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border p-3 dark:border-slate-800">
                  <div className="text-sm font-bold mb-2">Top Items (Today)</div>
                  <div className="grid gap-2 text-sm max-h-[260px] overflow-auto pr-1">
                    {todayItemCounts.slice(0, 15).map((x, i) => (
                      <div key={i} className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{x.name}</div>
                          <div className="text-xs text-gray-500 dark:text-slate-400">Qty {x.qty}</div>
                        </div>
                        <div className="font-bold">{formatCurrency(x.revenue)}</div>
                      </div>
                    ))}
                    {todayItemCounts.length === 0 && (
                      <div className="text-gray-500 dark:text-slate-400 italic">No items sold yet</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inventory modal (unchanged UI, just dark classes) */}
        {showInventory && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl border p-4 relative dark:bg-slate-900 dark:border-slate-800">
              <button
                onClick={() => setShowInventory(false)}
                className="absolute top-3 right-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-slate-300" />
              </button>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-bold">Inventory</div>
                  <div className="text-sm text-gray-500 dark:text-slate-400">
                    Editing: <span className="font-semibold">{category}</span>{" "}
                    {cfg.trackStock ? "" : "(Quick/custom category — no stock list.)"}
                  </div>
                </div>

                <button
                  onClick={() => setInventory(deepClone(DEFAULT_INVENTORY))}
                  className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-semibold dark:bg-slate-800 dark:hover:bg-slate-700"
                >
                  Reset Inventory
                </button>
              </div>

              {!cfg.trackStock ? (
                <div className="mt-6 text-gray-600 dark:text-slate-300">
                  <span className="font-semibold">{category}</span> uses quick + custom pricing.
                </div>
              ) : (
                <>
                  <div className="mt-4 rounded-2xl border bg-gray-50 p-3 dark:bg-slate-800 dark:border-slate-700">
                    <div className="text-xs font-semibold text-gray-500 dark:text-slate-300 mb-2 flex items-center gap-2">
                      <PackagePlus className="w-4 h-4" /> Add Item
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[1fr_160px_160px_140px] gap-2">
                      <input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Item name"
                        className="px-3 py-3 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700"
                      />
                      <input
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value.replace(/[^\d.]/g, ""))}
                        placeholder="Price"
                        inputMode="decimal"
                        className="px-3 py-3 rounded-xl border bg-white text-right font-semibold dark:bg-slate-900 dark:border-slate-700"
                      />
                      <input
                        value={newStock}
                        onChange={(e) => setNewStock(e.target.value.replace(/[^\d]/g, ""))}
                        placeholder="Stock"
                        inputMode="numeric"
                        className="px-3 py-3 rounded-xl border bg-white text-right font-semibold dark:bg-slate-900 dark:border-slate-700"
                      />
                      <button
                        onClick={addNewItem}
                        className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 overflow-auto max-h-[60vh]">
                    <div className="grid grid-cols-1 gap-2">
                      {(inventory[category] ?? []).map((it) => (
                        <div
                          key={it.id}
                          className="rounded-2xl border p-3 flex flex-col md:flex-row md:items-center gap-2 dark:border-slate-800"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-gray-500 dark:text-slate-400 flex items-center gap-2">
                              <Pencil className="w-4 h-4" />
                              Edit item
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_180px] gap-2 mt-2">
                              <input
                                value={it.name}
                                onChange={(e) => setItemField(it.id, "name", e.target.value)}
                                className="px-3 py-2 rounded-xl border dark:bg-slate-900 dark:border-slate-700"
                              />
                              <input
                                value={String(it.price)}
                                onChange={(e) =>
                                  setItemField(it.id, "price", e.target.value.replace(/[^\d.]/g, ""))
                                }
                                inputMode="decimal"
                                className="px-3 py-2 rounded-xl border text-right font-semibold dark:bg-slate-900 dark:border-slate-700"
                              />
                              <input
                                value={String(it.stock)}
                                onChange={(e) =>
                                  setItemField(it.id, "stock", e.target.value.replace(/[^\d]/g, ""))
                                }
                                inputMode="numeric"
                                className="px-3 py-2 rounded-xl border text-right font-semibold dark:bg-slate-900 dark:border-slate-700"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => bumpStock(it.id, -1)}
                              className="px-3 py-3 rounded-xl border bg-gray-50 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700"
                              aria-label="Decrease stock"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => bumpStock(it.id, +1)}
                              className="px-3 py-3 rounded-xl border bg-gray-50 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700"
                              aria-label="Increase stock"
                            >
                              <Plus className="w-4 h-4" />
                            </button>

                            <div className="px-3 py-2 rounded-xl bg-gray-50 border text-sm font-semibold dark:bg-slate-800 dark:border-slate-700">
                              {formatCurrency(it.price)} · Stock {it.stock}
                            </div>
                          </div>
                        </div>
                      ))}

                      {(inventory[category] ?? []).length === 0 && (
                        <div className="text-center text-gray-500 dark:text-slate-400 py-10">
                          No items yet. Add one above.
                        </div>
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border p-4 relative dark:bg-slate-900 dark:border-slate-800">
              <button
                onClick={() => setShowHistory(false)}
                className="absolute top-3 right-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-slate-300" />
              </button>

              <div className="text-lg font-bold mb-3">Sales History</div>
              <SalesHistory sales={sales} onRefund={refund} onClearToday={clearTodaySales} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default POS;
