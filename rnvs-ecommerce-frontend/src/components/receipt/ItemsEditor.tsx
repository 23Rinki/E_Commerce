'use client';

import { Plus, Trash2 } from 'lucide-react';
import type { SampleItem } from '@/lib/receipt/types';

interface Props {
  items: SampleItem[];
  onChange: (items: SampleItem[]) => void;
}

export default function ItemsEditor({ items, onChange }: Props) {
  const update = (i: number, patch: Partial<SampleItem>) => {
    const next = [...items];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const add = () => onChange([...items, { id: `item_${Date.now()}`, name: 'New item', qty: 1, rate: 0 }]);
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-12 gap-2 px-2 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
        <div className="col-span-6">Item</div>
        <div className="col-span-2 text-right">Qty</div>
        <div className="col-span-3 text-right">Rate (₹)</div>
        <div className="col-span-1" />
      </div>
      {items.map((it, i) => (
        <div key={it.id} className="grid grid-cols-12 gap-2 items-center">
          <input
            value={it.name}
            onChange={(e) => update(i, { name: e.target.value })}
            className="col-span-6 h-9 text-sm px-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#3B5BDB]"
          />
          <input
            type="number" min="0" value={it.qty}
            onChange={(e) => update(i, { qty: Number(e.target.value) || 0 })}
            className="col-span-2 h-9 text-sm text-right px-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#3B5BDB]"
          />
          <input
            type="number" min="0" value={it.rate}
            onChange={(e) => update(i, { rate: Number(e.target.value) || 0 })}
            className="col-span-3 h-9 text-sm text-right px-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#3B5BDB]"
          />
          <button onClick={() => remove(i)} className="col-span-1 h-9 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center">
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="w-full mt-2 h-9 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 text-slate-600 text-sm hover:text-[#3B5BDB] hover:border-[#3B5BDB] transition-colors"
      >
        <Plus size={14} /> Add another item
      </button>
    </div>
  );
}
