import React from 'react';

interface PriceButtonProps {
  value: number;
  label: string;
  imageUrl?: string;
  onClick: () => void;
  isPulsing: boolean;
  size?: 'default' | 'small';
}

const PriceButton: React.FC<PriceButtonProps> = ({ value, label, imageUrl, onClick, isPulsing }) => {
  return (
    <button
      onClick={onClick}
      className={`${
        isPulsing ? 'btn-pulse' : ''
      } bg-gray-100 hover:bg-gray-200 text-gray-800 text-xl font-semibold rounded-xl shadow transition-all flex flex-col items-center justify-center p-4 relative overflow-hidden aspect-square`}
    >
      {imageUrl ? (
        <>
          <img
            src={imageUrl}
            alt={label}
            className="w-full h-auto object-contain rounded-lg mb-2"
          />
          <span className="text-sm font-bold">{label}</span>
        </>
      ) : (
        <span className="">{label}</span>
      )}
    </button>
  );
};

export default PriceButton;