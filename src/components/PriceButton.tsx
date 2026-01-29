import React from "react";
import { formatCurrency } from "../utils/formatters";

interface PriceButtonProps {
  value: number;
  imageUrl?: string;
  onClick: () => void;
  isPulsing: boolean;
  size?: "default" | "small";
}

const PriceButton: React.FC<PriceButtonProps> = ({
  value,
  imageUrl,
  onClick,
  isPulsing,
  size = "default",
}) => {
  const label = formatCurrency(value);

  return (
    <button
      onClick={onClick}
      aria-label={`Add ${label}`}
      className={[
        "relative overflow-hidden rounded-2xl border font-extrabold",
        "bg-gray-50 hover:bg-gray-100 active:scale-[0.99] transition",
        size === "small" ? "p-3 text-base min-h-[64px]" : "p-4 text-lg min-h-[84px]",
        isPulsing ? "ring-2 ring-blue-400" : "border-gray-200",
        "flex items-center justify-center gap-3",
      ].join(" ")}
    >
      {imageUrl ? (
        <>
          <img
            src={imageUrl}
            alt=""
            className={size === "small" ? "h-8 w-auto" : "h-10 w-auto"}
            draggable={false}
          />
          <span>{label}</span>
        </>
      ) : (
        <span>{label}</span>
      )}
    </button>
  );
};

export default PriceButton;
