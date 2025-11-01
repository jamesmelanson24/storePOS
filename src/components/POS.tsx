import React, { useState, useEffect } from 'react';
import { DollarSign, Trash2, Check, RotateCcw, Delete, X, RefreshCw } from 'lucide-react';
import PriceButton from './PriceButton';
import SalesHistory from './SalesHistory';
import { Sale } from '../types';
import { formatCurrency } from '../utils/formatters';

import bill20Url from '../assets/20-fotor.png';
import bill10Url from '../assets/10-fotor.png';
import bill5Url from '../assets/5-fotor.png';
import bill2Url from '../assets/2-fotor.png';
import bill1Url from '../assets/1-fotor.png';
import coin25Url from '../assets/25-fotor.png';

const POS: React.FC = () => {
  const [currentTotal, setCurrentTotal] = useState<number>(0);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isPulse, setIsPulse] = useState<string | null>(null);
  const [calculations, setCalculations] = useState<string[]>([]);
  const [showTotalModal, setShowTotalModal] = useState(false);
  const [amountTendered, setAmountTendered] = useState<string>('0.00');
  const [changeDue, setChangeDue] = useState<number | null>(null);
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [multiplier, setMultiplier] = useState<number>(1);

  useEffect(() => {
    const savedSales = localStorage.getItem('yard-sale-pos-sales');
    if (savedSales) {
      setSales(JSON.parse(savedSales));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('yard-sale-pos-sales', JSON.stringify(sales));
  }, [sales]);

  const denominations = [
    { value: 20, imageUrl: bill20Url },
    { value: 10, imageUrl: bill10Url },
    { value: 5, imageUrl: bill5Url },
    { value: 2, imageUrl: bill2Url },
    { value: 1, imageUrl: bill1Url },
    { value: 0.25, imageUrl: coin25Url }
  ];

  const calculateTaxBreakdown = (total: number) => {
    if (!taxEnabled) return { subtotal: total, tax: 0, total };

    const subtotal = total / 1.14;
    const tax = total - subtotal;
    return { subtotal, tax, total };
  };

  const handleAddAmount = (amount: number) => {
    setIsPulse(amount.toString());
    setTimeout(() => setIsPulse(null), 300);
    const totalAmount = amount * multiplier;
    setCurrentTotal(prev => prev + totalAmount);
    if (multiplier > 1) {
      setCalculations(prev => [...prev, `${multiplier} × ${formatCurrency(amount)}`]);
    } else {
      setCalculations(prev => [...prev, formatCurrency(amount)]);
    }
    setMultiplier(1);
  };

  const handleDeleteLastAmount = () => {
    if (calculations.length > 0) {
      const lastCalc = calculations[calculations.length - 1];
      const match = lastCalc.match(/(\d+)\s*×\s*\$?([\d.]+)/);

      let amountToSubtract = 0;
      if (match) {
        const qty = parseFloat(match[1]);
        const price = parseFloat(match[2]);
        amountToSubtract = qty * price;
      } else {
        const priceMatch = lastCalc.match(/\$?([\d.]+)/);
        if (priceMatch) {
          amountToSubtract = parseFloat(priceMatch[1]);
        }
      }

      setCurrentTotal(prev => Math.max(0, prev - amountToSubtract));
      setCalculations(prev => prev.slice(0, -1));
    }
  };

  const handleTotalClick = () => {
    if (currentTotal > 0) {
      setShowTotalModal(true);
      setAmountTendered('0.00');
      setChangeDue(null);
    }
  };

  const handleCompleteSale = () => {
    if (currentTotal > 0) {
      const newSale: Sale = {
        id: Date.now(),
        timestamp: new Date(),
        total: currentTotal
      };
      setSales(prev => [newSale, ...prev]);
      handleClearSale();
    }
  };

  const handleClearSale = () => {
    setCurrentTotal(0);
    setCalculations([]);
    setShowTotalModal(false);
    setAmountTendered('0.00');
    setChangeDue(null);
  };

  const handleClearAllSales = () => {
    if (confirm('Are you sure you want to clear all sales history?')) {
      setSales([]);
    }
  };

  const handleRefund = (saleId: number) => {
    const sale = sales.find(s => s.id === saleId);
    if (sale && confirm(`Refund ${formatCurrency(sale.total)}?`)) {
      setSales(prev => prev.filter(s => s.id !== saleId));
    }
  };

  const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);

  const numpadButtons = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
    ['00', 'backspace']
  ];

  return (
    <div className="mx-auto max-w-7xl px-2 sm:px-3 md:px-4 py-3 sm:py-4 md:py-6">
      <header className="text-center mb-4 sm:mb-6">
        <div className="flex flex-col items-center">
          <img
            src="https://i.imgur.com/sLeCCU2.jpeg"
            alt="Store Logo"
            className="h-10 sm:h-14 md:h-16 mb-2 sm:mb-3 object-contain"
          />
          <p className="text-xs sm:text-sm text-gray-600">Quick and simple point of sale</p>
          <p className="text-xs sm:text-sm text-gray-600">Tine in, Taste Life: Music, Trends, Fun, and Treats!</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 md:p-6 lg:col-span-2 flex flex-col">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <p className="text-gray-600 mb-1">Current Total:</p>
              <h2 className="money text-3xl sm:text-4xl font-bold text-gray-800">
                {formatCurrency(currentTotal)}
              </h2>
              {calculations.length > 0 && (
                <div className="mt-2 text-xs sm:text-sm text-gray-500">
                  <div className="fade-in font-mono">
                    {calculations.join(' + ')} = {formatCurrency(currentTotal)}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDeleteLastAmount}
                disabled={calculations.length === 0}
                className={`p-3 rounded-full transition-colors ${
                  calculations.length === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-red-100 hover:bg-red-200 text-red-600'
                }`}
                title="Delete last amount"
              >
                <Delete className="w-5 h-5" />
              </button>
              <button
                onClick={handleClearSale}
                className="p-3 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
                title="Clear current sale"
              >
                <RotateCcw className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={taxEnabled}
                onChange={(e) => setTaxEnabled(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Nova Scotia HST (14%)</span>
            </label>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6 flex-grow">
            <div className="col-span-1 p-3 sm:p-4 bg-gray-50 rounded-lg flex flex-col">
              <p className="text-sm font-semibold text-gray-700 mb-3">Multiplier: <span className="text-blue-600">{multiplier}x</span></p>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    onClick={() => setMultiplier(num)}
                    className={`aspect-square rounded-lg font-bold text-sm sm:text-base transition-all ${
                      multiplier === num
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-300'
                    }`}
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={() => setMultiplier(10)}
                  className={`aspect-square rounded-lg font-bold text-sm sm:text-base transition-all ${
                    multiplier === 10
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-300'
                  }`}
                >
                  10
                </button>
                <button
                  onClick={handleTotalClick}
                  disabled={currentTotal <= 0}
                  className={`col-span-2 aspect-square rounded-lg font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1
                    ${currentTotal > 0
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                      : 'bg-gray-400 cursor-not-allowed text-white'}`}
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Total</span>
                </button>
              </div>
            </div>

            <div className="col-span-2 grid grid-cols-3 gap-1">
              {denominations.map((denom) => (
                <PriceButton
                  key={denom.value}
                  value={denom.value}
                  imageUrl={denom.imageUrl}
                  onClick={() => handleAddAmount(denom.value)}
                  isPulsing={isPulse === denom.value.toString()}
                />
              ))}
            </div>
          </div>

          <button
            onClick={handleCompleteSale}
            disabled={currentTotal <= 0}
            className={`w-full py-6 rounded-xl font-bold text-xl text-white transition-all flex items-center justify-center gap-3 shadow-lg
              ${currentTotal > 0
                ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-xl'
                : 'bg-gray-400 cursor-not-allowed'}`}
          >
            <Check className="w-6 h-6" />
            <span>Complete Sale</span>
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 md:p-6 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800">Sales History</h3>
            <button
              onClick={handleClearAllSales}
              className="text-red-600 hover:text-red-700 flex items-center gap-1 text-sm"
              disabled={sales.length === 0}
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          </div>
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600">Total Sales Today:</p>
            <p className="money text-2xl font-bold text-blue-600">
              {formatCurrency(totalSales)}
            </p>
          </div>
          <SalesHistory sales={sales} onRefund={handleRefund} />
        </div>
      </div>

      {showTotalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-4 relative">
            <button
              onClick={() => setShowTotalModal(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-gray-800 mb-3">Sale Total</h3>

            <div className="bg-gray-50 p-3 rounded-lg mb-3">
              <div className="flex justify-between items-baseline">
                <span className="text-gray-600 text-sm">Total:</span>
                <span className="money text-2xl font-bold text-gray-800">
                  {formatCurrency(currentTotal)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1 mb-3">
              {denominations.map((denom) => (
                <button
                  key={denom.value}
                  onClick={() => {
                    const newAmount = parseFloat(amountTendered) + denom.value;
                    setAmountTendered(newAmount.toFixed(2));
                    setChangeDue(newAmount - currentTotal);
                  }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-2 rounded-lg transition-colors flex items-center justify-center aspect-square"
                  aria-label={`Add ${formatCurrency(denom.value)}`}
                >
                  {denom.imageUrl && (
                    <img
                      src={denom.imageUrl}
                      alt={`${formatCurrency(denom.value)} denomination`}
                      className="h-full w-full max-h-full max-w-full object-contain"
                      draggable={false}
                    />
                  )}
                  <span className="sr-only">Add {formatCurrency(denom.value)}</span>
                </button>
              ))}
            </div>

            <div className="bg-blue-50 p-2 rounded-lg mb-3">
              <p className="text-xs text-gray-600 mb-1">Tendered: <span className="money font-semibold">${amountTendered}</span></p>
              {changeDue !== null && changeDue >= 0 && (
                <p className="text-lg font-bold text-blue-600">Change: <span className="money">{formatCurrency(changeDue)}</span></p>
              )}
              {changeDue !== null && changeDue < 0 && (
                <p className="text-sm text-red-600">Need {formatCurrency(Math.abs(changeDue))} more</p>
              )}
            </div>

            <div className="flex gap-2 mb-2">
              <button
                onClick={() => {
                  setAmountTendered(currentTotal.toFixed(2));
                  setChangeDue(0);
                }}
                className="flex-1 py-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg font-semibold text-xs"
              >
                Exact
              </button>
              <button
                onClick={() => {
                  setAmountTendered('0.00');
                  setChangeDue(null);
                }}
                className="flex-1 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold text-xs"
              >
                Clear
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowTotalModal(false)}
                className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleCompleteSale();
                  setShowTotalModal(false);
                }}
                disabled={changeDue === null || changeDue < 0}
                className={`flex-1 py-3 rounded-lg font-semibold text-white ${
                  changeDue !== null && changeDue >= 0
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                Complete Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
