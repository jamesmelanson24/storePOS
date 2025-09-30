import React from 'react';
import { DollarSign } from 'lucide-react';

interface PriceButtonProps {
  value: number;
  label: string;
  onClick: () => void;
  isPulsing: boolean;
}

const PriceButton: React.FC<PriceButtonProps> = ({ value, label, onClick, isPulsing }) => {
  const getBackgroundColor = () => {
    if (value >= 10) return 'bg-emerald-600 hover:bg-emerald-700';
    if (value >= 5) return 'bg-emerald-500 hover:bg-emerald-600';
    if (value >= 1) return 'bg-emerald-400 hover:bg-emerald-500';
    return 'bg-emerald-300 hover:bg-emerald-400';
  };

  return (
    <button
      onClick={onClick}
      className={`${getBackgroundColor()} ${
        isPulsing ? 'btn-pulse' : ''
      } text-white text-xl font-semibold py-6 px-4 rounded-lg shadow transition-all flex items-center justify-center h-24`}
    >
      <span className="text-2xl">{label}</span>
    </button>
  );
};

export default PriceButton;