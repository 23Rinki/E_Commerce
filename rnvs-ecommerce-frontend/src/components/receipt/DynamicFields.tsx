'use client';

import { GripVertical, ArrowUp, ArrowDown, Eye, EyeOff, Plus, X } from 'lucide-react';
import type { BillField } from '@/lib/receipt/types';

interface Props {
  items: BillField[];
  onChange: (items: BillField[]) => void;
  addPlaceholder: string;
}

export default function DynamicFields({ items, onChange, addPlaceholder }: Props) {
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const update = (i: number, patch: Partial<BillField>) => {
    const next = [...items];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, { id: `f_${Date.now()}`, label: 'New field', value: '', visible: true }]);

  return (
    <div className="space-y-2">
      {items.map((f, i) => (
        <div
          key={f.id}
          className={`group rounded-lg border border-slate-200 bg-white p-3 transition-all
            ${f.visible ? '' : 'opacity-60'} hover:border-slate-300 hover:shadow-sm`}
        >
          <div className="flex items-center gap-2">
            <div className="flex flex-col text-slate-400">
              <button type="button" onClick={() => move(i, -1)} className="hover:text-slate-700 p-0.5"><ArrowUp size={12} /></button>
              <button type="button" onClick={() => move(i, 1)} className="hover:text-slate-700 p-0.5"><ArrowDown size={12} /></button>
            </div>
            <GripVertical size={16} className="text-slate-300" />
            <div className="flex-1 grid grid-cols-2 gap-2">
              <input
                value={f.label}
                onChange={(e) => update(i, { label: e.target.value })}
                className="h-9 text-sm px-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#3B5BDB]"
                placeholder="Label"
              />
              <input
                value={f.value}
                onChange={(e) => update(i, { value: e.target.value })}
                className="h-9 text-sm px-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#3B5BDB]"
                placeholder="Fixed value (blank = auto from order)"
              />
            </div>
            <div className="flex items-center gap-1.5 pl-1">
              {f.visible ? <Eye size={14} className="text-slate-400" /> : <EyeOff size={14} className="text-slate-400" />}
              <button
                type="button"
                role="switch"
                aria-checked={f.visible}
                onClick={() => update(i, { visible: !f.visible })}
                className={`w-8 h-[18px] rounded-full transition-colors relative ${f.visible ? 'bg-[#3B5BDB]' : 'bg-slate-300'}`}
              >
                <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform ${f.visible ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <button onClick={() => remove(i)} className="p-1 text-slate-300 hover:text-red-500">
              <X size={14} />
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-slate-300 text-slate-500 text-xs font-medium hover:text-[#3B5BDB] hover:border-[#3B5BDB] transition-colors"
      >
        <Plus size={13} /> {addPlaceholder}
      </button>
    </div>
  );
}
