import React from 'react';

interface PriceButtonProps {
  value: number;
  label: string;
  imageUrl?: string;
  onClick: () => void;
  isPulsing: boolean;
}

const PriceButton: React.FC<PriceButtonProps> = ({ value, label, imageUrl, onClick, isPulsing }) => {
  const getBackgroundColor = () => {
    if (value >= 10) return '';
    if (value >= 5) return '';
    if (value >= 1) return '';
    return 'bg-emerald-300 hover:bg-emerald-400';
  };

  return (
    <button
      onClick={onClick}
      className={`${getBackgroundColor()} ${
        isPulsing ? 'btn-pulse' : ''
      } text-white text-xl font-semibold py-6 px-4 rounded-lg shadow transition-all flex flex-col items-center justify-center h-24 relative overflow-hidden`}
    >
      {imageUrl ? (
        <>
          <img 
            src={imageUrl} 
            alt={label}
            className="w-12 h-12 object-cover rounded-md mb-1 shadow-sm"
          />
          <span className="text-sm font-bold drop-shadow-sm">{label}</span>
        </>
      ) : (
        <span className="text-2xl">{label}</span>
      )}
    </button>
  );
};

export default PriceButton;