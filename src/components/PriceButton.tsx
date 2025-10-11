 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/src/components/PriceButton.tsx b/src/components/PriceButton.tsx
index 65770544e7ce0edab5e05bf7cc04c1d66c005d2f..ea42a495b8ca1fba487cc2a2b2bc23a019e0f96f 100644
--- a/src/components/PriceButton.tsx
+++ b/src/components/PriceButton.tsx
@@ -1,36 +1,40 @@
 import React from 'react';
+import { formatCurrency } from '../utils/formatters';
 
 interface PriceButtonProps {
   value: number;
-  label: string;
   imageUrl?: string;
   onClick: () => void;
   isPulsing: boolean;
   size?: 'default' | 'small';
 }
 
-const PriceButton: React.FC<PriceButtonProps> = ({ value, label, imageUrl, onClick, isPulsing }) => {
+const PriceButton: React.FC<PriceButtonProps> = ({ value, imageUrl, onClick, isPulsing }) => {
+  const accessibleLabel = formatCurrency(value);
+
   return (
     <button
       onClick={onClick}
+      aria-label={`Add ${accessibleLabel}`}
       className={`${
         isPulsing ? 'btn-pulse' : ''
-      } bg-gray-100 hover:bg-gray-200 text-gray-800 text-xl font-semibold rounded-xl shadow transition-all flex flex-col items-center justify-center p-4 relative overflow-hidden aspect-square`}
+      } bg-gray-100 hover:bg-gray-200 text-gray-800 text-lg sm:text-xl font-semibold rounded-xl shadow transition-all flex items-center justify-center p-4 sm:p-5 relative overflow-hidden aspect-square`}
     >
       {imageUrl ? (
         <>
           <img
             src={imageUrl}
-            alt={label}
-            className="w-full h-auto object-contain rounded-lg mb-2"
+            alt={`${accessibleLabel} denomination`}
+            className="h-full w-full max-h-full max-w-full object-contain"
+            draggable={false}
           />
-          <span className="text-sm font-bold">{label}</span>
+          <span className="sr-only">{accessibleLabel}</span>
         </>
       ) : (
-        <span className="">{label}</span>
+        <span>{accessibleLabel}</span>
       )}
     </button>
   );
 };
 
 export default PriceButton;
\ No newline at end of file 
EOF
)
