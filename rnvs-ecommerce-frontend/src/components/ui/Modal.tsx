'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  maxWidth?: string;
}

export default function Modal({ open, onClose, title, children, maxWidth = 'max-w-md' }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-ink/40 z-50" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-2rem)]',
            'bg-paper rounded-2xl shadow-lg border border-mist max-h-[85vh] overflow-y-auto',
            maxWidth,
          )}
        >
          {title ? (
            <div className="flex items-center justify-between px-5 py-4 border-b border-mist">
              <Dialog.Title className="text-sm font-semibold text-ink">{title}</Dialog.Title>
              <Dialog.Close className="p-1 rounded-lg text-ink-3 hover:text-ink hover:bg-mist-2 transition-colors">
                <X size={16} />
              </Dialog.Close>
            </div>
          ) : (
            <>
              <Dialog.Title className="sr-only">Dialog</Dialog.Title>
              <Dialog.Close className="absolute right-4 top-4 p-1 rounded-lg text-ink-3 hover:text-ink hover:bg-mist-2 transition-colors">
                <X size={16} />
              </Dialog.Close>
            </>
          )}
          <div className={title ? 'p-5' : 'p-6'}>{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
