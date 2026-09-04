'use client';

import { Check, FileText, Receipt, Sparkles, LayoutTemplate } from 'lucide-react';
import { TEMPLATES } from '@/lib/receipt/defaults';
import type { TemplateId } from '@/lib/receipt/types';

const ICONS = { classic: Receipt, standard: FileText, thermal: LayoutTemplate, minimal: Sparkles };

interface Props {
  value: TemplateId;
  onChange: (id: TemplateId) => void;
}

export default function TemplatePicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {TEMPLATES.map((t) => {
        const Icon = ICONS[t.id] || FileText;
        const active = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`group relative text-left rounded-xl border p-4 transition-all duration-200
              ${active
                ? 'border-[#3B5BDB] bg-[#F5F8FF] ring-2 ring-[#3B5BDB]/20 shadow-sm'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:-translate-y-0.5 hover:shadow-sm'}`}
          >
            <div className="flex items-start justify-between">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: active ? '#E6F0FA' : '#F1F5F9', color: t.accent }}
              >
                <Icon size={18} />
              </div>
              {active && (
                <span className="w-5 h-5 rounded-full bg-[#3B5BDB] text-white flex items-center justify-center">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </div>
            <div className="mt-3 font-heading font-semibold text-slate-900">{t.name}</div>
            <div className="text-xs text-slate-500 leading-relaxed mt-0.5">{t.desc}</div>
          </button>
        );
      })}
    </div>
  );
}
