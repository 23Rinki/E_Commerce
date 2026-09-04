'use client';

import { useRef, useState } from 'react';
import { UploadCloud, X, Loader2 } from 'lucide-react';

interface Props {
  value: string; // absolute or relative URL, empty if none
  apiBase: string;
  uploading?: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
  onError: (message: string) => void;
  label?: string;
  maxSizeMB?: number;
}

export default function LogoUploader({ value, apiBase, uploading, onUpload, onRemove, onError, label = 'Drag & drop your logo', maxSizeMB = 2 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const src = value ? (value.startsWith('http') || value.startsWith('data:') ? value : `${apiBase}${value}`) : '';

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > maxSizeMB * 1024 * 1024) return onError(`File must be under ${maxSizeMB} MB`);
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type))
      return onError('Only PNG, JPG, WEBP or SVG allowed');
    onUpload(file);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files?.[0]); }}
      className={`relative cursor-pointer rounded-xl border-2 border-dashed p-5 flex items-center gap-4 transition-all
        ${drag ? 'border-[#3B5BDB] bg-[#F5F8FF]' : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100'}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="w-14 h-14 object-contain rounded-md bg-white p-1 border border-slate-200" />
      ) : (
        <div className="w-14 h-14 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-400">
          {uploading ? <Loader2 size={20} className="animate-spin" /> : <UploadCloud size={22} />}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-900">{uploading ? 'Uploading…' : src ? 'Replace' : label}</div>
        <div className="text-xs text-slate-500 mt-0.5">PNG, JPG, WEBP or SVG · max {maxSizeMB} MB</div>
      </div>
      {src && !uploading && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="w-8 h-8 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center"
        >
          <X size={16} />
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,.svg"
        className="hidden"
        onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }}
      />
    </div>
  );
}
