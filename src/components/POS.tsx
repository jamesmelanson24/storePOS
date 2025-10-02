import React, { useState, useEffect } from 'react';
import { DollarSign, Trash2, Check, RotateCcw, Delete, X } from 'lucide-react';
import PriceButton from './PriceButton';
import SalesHistory from './SalesHistory';
import { Sale } from '../types';
import { formatCurrency } from '../utils/formatters';

const POS: React.FC = () => {
  const [currentTotal, setCurrentTotal] = useState<number>(0);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isPulse, setIsPulse] = useState<string | null>(null);
  const [calculations, setCalculations] = useState<string[]>([]);
  const [showTotalModal, setShowTotalModal] = useState(false);
  const [amountTendered, setAmountTendered] = useState<string>('0.00');
  const [changeDue, setChangeDue] = useState<number | null>(null);
  const [taxEnabled, setTaxEnabled] = useState(true);
  
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
    { value: 20, label: '$20' },
    { value: 10, label: '$10' },
    { value: 5, label: '$5' },
    { value: 2, label: '$2' },
    { value: 1, label: '$1' },
    { value: 0.25, label: '25¢' }
  ];

  const calculateTaxBreakdown = (total: number) => {
    if (!taxEnabled) return { subtotal: total, tax: 0, total };
    
    const subtotal = total / 1.14; // Remove 14% HST
    const tax = total - subtotal;
    return { subtotal, tax, total };
  };

  const handleAddAmount = (amount: number) => {
    setIsPulse(amount.toString());
    setTimeout(() => setIsPulse(null), 300);
    setCurrentTotal(prev => prev + amount);
    setCalculations(prev => [...prev, formatCurrency(amount)]);
  };

  const handleDeleteLastAmount = () => {
    if (calculations.length > 0) {
      const lastAmount = calculations[calculations.length - 1];
      const numericValue = parseFloat(lastAmount.replace(/[^0-9.-]+/g, ''));
      setCurrentTotal(prev => prev - numericValue);
      setCalculations(prev => prev.slice(0, -1));
    }
  };

  const handleCompleteSale = () => {
    if (currentTotal <= 0) return;
    
    const newSale: Sale = {
      id: Date.now(),
      timestamp: new Date(),
      total: currentTotal
    };
    
    setSales((prev) => [newSale, ...prev]);
    setCurrentTotal(0);
    setCalculations([]);
    setShowTotalModal(false);
    setAmountTendered('0.00');
    setChangeDue(null);
  };

  const handleTotalClick = () => {
    if (currentTotal > 0) {
      setShowTotalModal(true);
      setAmountTendered('0.00');
      setChangeDue(null);
    }
  };

  const handleNumpadInput = (value: string) => {
    if (value === 'backspace') {
      setAmountTendered(prev => {
        const numStr = prev.replace(/\D/g, '');
        if (numStr.length <= 1) {
          setChangeDue(0 - currentTotal);
          return '0.00';
        }
        const newStr = numStr.slice(0, -1);
        const newValue = parseInt(newStr) / 100;
        setChangeDue(newValue - currentTotal);
        return newValue.toFixed(2);
      });
      return;
    }
    
    if (value === 'clear') {
      setAmountTendered('0.00');
      setChangeDue(0 - currentTotal);
      return;
    }

    if (value === '.') {
      return; // Ignore decimal point as we're handling it automatically
    }

    setAmountTendered(prev => {
      const numStr = prev.replace(/\D/g, '');
      const newStr = numStr === '0' ? value : numStr + value;
      if (newStr.length > 7) return prev; // Prevent overflow
      const newValue = parseInt(newStr) / 100;
      setChangeDue(newValue - currentTotal);
      return newValue.toFixed(2);
    });
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

  const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);

  const numpadButtons = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
    ['00', 'backspace']
  ];

  return (
    <div className="container mx-auto p-4 md:py-8">
      <header className="text-center mb-6">
        <div className="flex flex-col items-center">
          {/* Replace the src below with your logo URL */}
          <img 
            src="https://i.imgur.com/sLeCCU2.jpeg" 
            alt="Store Logo" 
            className="h-16 mb-3 object-contain"
          />
          <p className="text-gray-600">Quick and simple point of sale</p>
          <p className="text-gray-600">Tine in, Taste Life: Music, Trends, Fun, and Treats!</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <p className="text-gray-600 mb-1">Current Total:</p>
              <h2 className="money text-4xl font-bold text-gray-800">
                {formatCurrency(currentTotal)}
              </h2>
              {calculations.length > 0 && (
                <div className="mt-2 text-sm text-gray-500">
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

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {denominations.map((denom) => (
              <PriceButton 
                key={denom.value}
                value={denom.value}
                label={denom.label}
                onClick={() => handleAddAmount(denom.value)}
                isPulsing={isPulse === denom.value.toString()}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleTotalClick}
              disabled={currentTotal <= 0}
              className={`py-4 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2
                ${currentTotal > 0 
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg' 
                  : 'bg-gray-400 cursor-not-allowed'}`}
            >
              <DollarSign className="w-5 h-5" />
              <span>Total</span>
            </button>

            <button
              onClick={handleCompleteSale}
              disabled={currentTotal <= 0}
              className={`py-4 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2
                ${currentTotal > 0 
                  ? 'bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg' 
                  : 'bg-gray-400 cursor-not-allowed'}`}
            >
              <Check className="w-5 h-5" />
              <span>Complete Sale</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Sales History</h2>
            <button 
              onClick={handleClearAllSales}
              className="text-sm px-3 py-1 rounded bg-red-100 text-red-600 hover:bg-red-200 flex items-center gap-1"
              title="Clear all sales"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Clear All</span>
            </button>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <p className="text-gray-600 text-sm">Total Sales:</p>
            <p className="money text-2xl font-bold text-green-700">{formatCurrency(totalSales)}</p>
            <p className="text-gray-600 text-sm mt-1">Total Transactions: {sales.length}</p>
          </div>

          <SalesHistory sales={sales} />
        </div>
      </div>

      {showTotalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Complete Sale</h3>
              <button 
                onClick={() => setShowTotalModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-600">Subtotal:</p>
              <p className="money text-2xl font-bold">{formatCurrency(currentTotal)}</p>
            </div>

            <div className="mb-4">
              <p className="text-gray-600 mb-2">Amount Tendered:</p>
              <div className="bg-gray-50 p-3 rounded-lg mb-2">
                <p className="money text-2xl font-bold text-right">
                  ${amountTendered}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {numpadButtons.map((row, rowIndex) => (
                  row.map((btn, btnIndex) => (
                    <button
                      key={`${rowIndex}-${btnIndex}`}
                      onClick={() => handleNumpadInput(btn)}
                      className={`
                        py-4 text-xl font-semibold rounded-lg transition-colors
                        ${btn === 'backspace'
                          ? 'bg-red-100 hover:bg-red-200 text-red-600'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                        }
                        ${btn === '00' ? 'col-span-2' : ''}
                      `}
                    >
                      {btn === 'backspace' ? '←' : btn}
                    </button>
                  ))
                ))}
                <button
                  onClick={() => handleNumpadInput('clear')}
                  className="col-span-3 py-2 mt-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold"
                >
                  Clear
                </button>
              </div>
            </div>

            {changeDue !== null && (
              <div className="mb-4">
                <p className="text-gray-600">Change Due:</p>
                <p className={`money text-2xl font-bold ${
                  changeDue >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(changeDue)}
                </p>
              </div>
            )}

            <button
              onClick={handleCompleteSale}
              disabled={!amountTendered || changeDue < 0}
              className={`w-full py-3 rounded-lg text-white font-semibold transition-colors ${
                amountTendered && changeDue >= 0
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              Complete Sale
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;