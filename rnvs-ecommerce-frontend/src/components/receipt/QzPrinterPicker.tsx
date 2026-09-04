'use client';

import { useEffect, useState } from 'react';
import { Loader2, Printer, ExternalLink } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { ensureQzConnected, listPrinters, QzNotAvailableError } from '@/lib/receipt/qzPrint';

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (printerName: string) => void;
}

export default function QzPrinterPicker({ open, onClose, onPick }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printers, setPrinters] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setPrinters([]);

    (async () => {
      try {
        await ensureQzConnected();
        const found = await listPrinters();
        setPrinters(found);
        if (found.length === 0) setError('QZ Tray is running, but no printers were found on this computer.');
      } catch (err) {
        setError(err instanceof QzNotAvailableError ? err.message : 'Something went wrong talking to QZ Tray.');
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Choose your thermal printer" maxWidth="max-w-sm">
      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-slate-500 text-sm">
          <Loader2 size={16} className="animate-spin" /> Looking for printers via QZ Tray…
        </div>
      )}

      {!loading && error && (
        <div className="space-y-3">
          <p className="text-sm text-red-600">{error}</p>
          <a
            href="https://qz.io/download/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#3B5BDB] hover:underline"
          >
            Download QZ Tray <ExternalLink size={13} />
          </a>
        </div>
      )}

      {!loading && !error && printers.length > 0 && (
        <div className="space-y-1.5">
          {printers.map((name) => (
            <button
              key={name}
              onClick={() => onPick(name)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-slate-200 hover:border-[#3B5BDB] hover:bg-[#F5F8FF] text-left text-sm text-slate-800 transition-colors"
            >
              <Printer size={15} className="text-slate-400 flex-shrink-0" /> {name}
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
