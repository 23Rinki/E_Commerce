'use client';

import { useRef, useState } from 'react';
import { FileText, Printer, Smartphone, Download, Maximize2, Minimize2, Zap, Settings2, ExternalLink } from 'lucide-react';
import type { PreviewFormat, ReceiptState, ResolvedReceiptData } from '@/lib/receipt/types';
import LiveReceipt from './LiveReceipt';
import QzPrinterPicker from './QzPrinterPicker';
import { getSavedPrinter, printRawReceipt, savePrinter, QzNotAvailableError } from '@/lib/receipt/qzPrint';

const FORMATS: { id: PreviewFormat; label: string; icon: typeof FileText }[] = [
  { id: 'paper', label: 'Paper (A4)', icon: FileText },
  { id: 'th80', label: 'Thermal 80mm', icon: Printer },
  { id: 'th58', label: 'Thermal 58mm', icon: Smartphone },
];

interface Props {
  state: ReceiptState;
  data: ResolvedReceiptData;
  apiBase: string;
  onError: (message: string) => void;
}

export default function LivePreview({ state, data, apiBase, onError }: Props) {
  const [format, setFormat] = useState<PreviewFormat>('paper');
  const [zoomOut, setZoomOut] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [qzPrinting, setQzPrinting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const thermalWidth: 80 | 58 | null = format === 'th80' ? 80 : format === 'th58' ? 58 : null;

  const runRawPrint = async (printerName: string) => {
    if (!thermalWidth) return;
    setQzPrinting(true);
    try {
      await printRawReceipt(state, data, thermalWidth, printerName);
    } catch (err) {
      onError(err instanceof QzNotAvailableError ? err.message : 'Could not print to the raw thermal printer. Please try again.');
    } finally {
      setQzPrinting(false);
    }
  };

  const handleRawPrintClick = () => {
    if (!thermalWidth) return;
    const saved = getSavedPrinter(thermalWidth);
    if (saved) { runRawPrint(saved); return; }
    setPickerOpen(true);
  };

  const handlePrinterPicked = (printerName: string) => {
    if (!thermalWidth) return;
    savePrinter(thermalWidth, printerName);
    setPickerOpen(false);
    runRawPrint(printerName);
  };

  const download = async () => {
    if (!receiptRef.current) return;
    setExporting(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas-pro'),
        import('jspdf'),
      ]);
      const canvas = await html2canvas(receiptRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const img = canvas.toDataURL('image/png');

      const thermalWidthMm = format === 'th80' ? 80 : format === 'th58' ? 58 : null;

      if (thermalWidthMm) {
        // Thermal roll paper — fixed real-world width, height grows with content (continuous roll)
        const heightMm = (canvas.height / canvas.width) * thermalWidthMm;
        const pdf = new jsPDF({ unit: 'mm', format: [thermalWidthMm, heightMm] });
        pdf.addImage(img, 'PNG', 0, 0, thermalWidthMm, heightMm);
        pdf.save(`receipt-${format}.pdf`);
      } else {
        const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: canvas.width > canvas.height ? 'landscape' : 'portrait' });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
        pdf.addImage(img, 'PNG', 0, 0, canvas.width * ratio, canvas.height * ratio);
        pdf.save(`receipt-${format}.pdf`);
      }
    } catch (err) {
      console.error('Receipt PDF export failed:', err);
      onError('Could not export PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    const styleId = 'receipt-print-page-size';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent =
      format === 'th80' ? '@page { size: 80mm auto; margin: 2mm; }'
      : format === 'th58' ? '@page { size: 58mm auto; margin: 2mm; }'
      : '@page { size: A4; margin: 12mm; }';
    window.print();
  };

  return (
    <section className="flex-1 h-full flex flex-col bg-[#E6F0FA] relative overflow-hidden preview-dot-pattern">
      <div className="flex items-center flex-wrap gap-y-2 justify-between px-6 py-3 bg-white/60 backdrop-blur-md border-b border-white/50 sticky top-0 z-10">
        <div className="text-xs uppercase tracking-widest text-slate-500 font-medium">Live preview</div>
        <div className="inline-flex bg-white/80 backdrop-blur rounded-full p-1 border border-white shadow-sm">
          {FORMATS.map((f) => {
            const Icon = f.icon;
            const active = format === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFormat(f.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5 transition-all
                  ${active ? 'bg-[#3B5BDB] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <Icon size={12} /> {f.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center flex-wrap justify-end gap-2">
          <button
            onClick={() => setZoomOut((v) => !v)}
            className="h-9 px-3 rounded-full bg-white/80 border border-white text-slate-600 hover:text-slate-900 inline-flex items-center"
          >
            {zoomOut ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
          </button>
          <button
            onClick={handlePrint}
            className="h-9 px-4 rounded-full bg-white/80 border border-white text-slate-700 hover:text-slate-900 text-sm font-medium inline-flex items-center gap-1.5"
          >
            <Printer size={14} /> Print
          </button>
          {thermalWidth && (
            <div className="flex items-center gap-1">
              <button
                onClick={handleRawPrintClick}
                disabled={qzPrinting}
                title="For printers with no driver installed — needs QZ Tray running on this computer"
                className="h-9 px-4 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium inline-flex items-center gap-1.5"
              >
                <Zap size={14} /> {qzPrinting ? 'Printing…' : 'Raw printer'}
              </button>
              <button
                onClick={() => setPickerOpen(true)}
                title="Change printer"
                className="h-9 w-9 rounded-full bg-white/80 border border-white text-slate-500 hover:text-slate-900 inline-flex items-center justify-center"
              >
                <Settings2 size={14} />
              </button>
            </div>
          )}
          <button
            onClick={download}
            disabled={exporting}
            className="h-9 px-4 rounded-full bg-[#3B5BDB] hover:bg-[#304AC0] disabled:opacity-60 text-white text-sm font-medium inline-flex items-center gap-1.5"
          >
            <Download size={14} /> {exporting ? 'Preparing…' : 'Download PDF'}
          </button>
        </div>
      </div>

      {thermalWidth ? (
        <div className="px-6 py-3 bg-amber-50 border-b-2 border-amber-300 text-center">
          <p className="text-sm text-amber-900">
            <strong>Printer installed normally in Windows/Mac?</strong> Use the grey <strong>Print</strong> button above.
            {' '}<strong>Bare printer with no driver?</strong> Install{' '}
            <a
              href="https://qz.io/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline underline-offset-2 inline-flex items-center gap-0.5"
            >
              QZ Tray <ExternalLink size={12} className="inline" />
            </a>{' '}
            once, keep it running, then use <strong>Raw printer</strong> above.
          </p>
        </div>
      ) : (
        <div className="px-6 py-1.5 bg-white/40 backdrop-blur-sm border-b border-white/50 text-[11px] text-slate-500 text-center">
          Select your regular printer in the dialog that opens — paper size is set automatically
        </div>
      )}

      <QzPrinterPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={handlePrinterPicked} />

      <div className="flex-1 overflow-auto p-8 md:p-12 flex justify-center items-start custom-scrollbar">
        <div className="transition-transform duration-300 origin-top" style={{ transform: format === 'paper' && zoomOut ? 'scale(0.7)' : 'scale(1)' }}>
          <div id="receipt-print-area">
            <LiveReceipt ref={receiptRef} state={state} data={data} format={format} apiBase={apiBase} />
          </div>
        </div>
      </div>
    </section>
  );
}
