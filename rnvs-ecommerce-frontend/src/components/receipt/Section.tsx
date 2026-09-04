'use client';

import { useState, ReactNode } from 'react';
import { ChevronDown, LucideIcon } from 'lucide-react';

interface SectionProps {
  icon: LucideIcon;
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export default function Section({ icon: Icon, title, defaultOpen = false, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden data-[open=true]:shadow-sm" data-open={open}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 group"
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              open ? 'bg-[#E6F0FA] text-[#3B5BDB]' : 'bg-slate-100 text-slate-600'
            }`}
          >
            <Icon size={15} />
          </div>
          <span className="font-heading font-medium text-slate-900 text-[15px]">{title}</span>
        </div>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4 pt-0">{children}</div>}
    </div>
  );
}
