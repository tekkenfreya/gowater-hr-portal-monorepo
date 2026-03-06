'use client';

import { useCallback } from 'react';
import { Printer } from 'lucide-react';

interface BarcodeLabelProps {
  serialNumber: string;
  unitType: 'vending_machine' | 'dispenser';
  modelName: string;
  barcodeSvg?: string;
}

function formatUnitType(type: BarcodeLabelProps['unitType']): string {
  return type === 'vending_machine' ? 'Vending Machine' : 'Dispenser';
}

export default function BarcodeLabel({ serialNumber, unitType, modelName, barcodeSvg }: BarcodeLabelProps) {
  const handlePrint = useCallback(() => {
    const printWindow = window.open('', '_blank', 'width=400,height=300');
    if (!printWindow) return;

    const labelHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Label - ${serialNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page {
            size: 60mm 30mm;
            margin: 0;
          }
          body {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            font-family: Arial, Helvetica, sans-serif;
          }
          .label {
            width: 60mm;
            height: 30mm;
            padding: 1.5mm 3mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            border: 1px solid #e5e7eb;
          }
          .brand {
            font-size: 8pt;
            font-weight: 700;
            color: #2563eb;
            letter-spacing: 0.5px;
          }
          .barcode-container {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            max-height: 14mm;
          }
          .barcode-container svg {
            max-width: 100%;
            max-height: 14mm;
          }
          .serial {
            font-family: 'Courier New', Courier, monospace;
            font-size: 7pt;
            font-weight: 600;
            letter-spacing: 1px;
            color: #111827;
          }
          .meta {
            font-size: 5pt;
            color: #6b7280;
            text-align: center;
          }
          @media print {
            body { min-height: auto; }
            .label { border: none; }
          }
        </style>
      </head>
      <body>
        <div class="label">
          <div class="brand">GoWater</div>
          <div class="barcode-container">${barcodeSvg || ''}</div>
          <div class="serial">${serialNumber}</div>
          <div class="meta">${formatUnitType(unitType)} &middot; ${modelName}</div>
        </div>
        <script>window.onload = function() { window.print(); window.close(); }<\/script>
      </body>
      </html>
    `;

    printWindow.document.write(labelHtml);
    printWindow.document.close();
  }, [serialNumber, unitType, modelName, barcodeSvg]);

  return (
    <div className="flex flex-col items-center">
      {/* Label Preview */}
      <div className="border border-gray-200 rounded-lg bg-white p-3 w-[226px]">
        <div className="flex flex-col items-center" style={{ height: '113px' }}>
          {/* Brand */}
          <span className="text-xs font-bold text-blue-600 tracking-wide">GoWater</span>

          {/* Barcode */}
          <div className="flex-1 flex items-center justify-center w-full my-1">
            {barcodeSvg ? (
              <div
                className="[&>svg]:max-w-full [&>svg]:max-h-[52px]"
                dangerouslySetInnerHTML={{ __html: barcodeSvg }}
              />
            ) : (
              <div className="h-[52px] w-full bg-gray-50 rounded flex items-center justify-center">
                <span className="text-xs text-gray-400">No barcode</span>
              </div>
            )}
          </div>

          {/* Serial Number */}
          <span className="font-mono text-xs font-semibold text-gray-900 tracking-wider">
            {serialNumber}
          </span>

          {/* Unit Type + Model */}
          <span className="text-[10px] text-gray-500 mt-0.5">
            {formatUnitType(unitType)} &middot; {modelName}
          </span>
        </div>
      </div>

      {/* Print Button */}
      <button
        onClick={handlePrint}
        disabled={!barcodeSvg}
        className="mt-4 inline-flex items-center space-x-1.5 px-4 py-2 bg-p3-cyan text-p3-navy-darkest rounded-lg text-sm font-bold hover:bg-p3-cyan-dark shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Printer className="w-4 h-4" />
        <span>Print Label</span>
      </button>
    </div>
  );
}
