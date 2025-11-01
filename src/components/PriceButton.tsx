import React from 'react';
import { formatCurrency } from '../utils/formatters';

interface PriceButtonProps {
  value: number;
  imageUrl?: string;
  onClick: () => void;
  isPulsing: boolean;
  size?: 'default' | 'small';
}

const PriceButton: React.FC<PriceButtonProps> = ({ value, imageUrl, onClick, isPulsing }) => {
  const accessibleLabel = formatCurrency(value);

  return (
    <button
      onClick={onClick}
      aria-label={`Add ${accessibleLabel}`}
      className={`${
        isPulsing ? 'btn-pulse' : ''
      } bg-gray-100 hover:bg-gray-200 text-gray-800 text-lg sm:text-xl font-semibold rounded-xl shadow transition-all flex items-center justify-center p-4 sm:p-5 relative overflow-hidden aspect-square`}
    >
      {imageUrl ? (
        <>
          <img
            src={imageUrl}
            alt={`${accessibleLabel} denomination`}
            className="h-full w-full max-h-full max-w-full object-contain rounded-none"
            draggable={false}
          />
          <span className="sr-only">{accessibleLabel}</span>
        </>
      ) : (
        <span>{accessibleLabel}</span>
      )}
    </button>
  );
};

export default PriceButton;
