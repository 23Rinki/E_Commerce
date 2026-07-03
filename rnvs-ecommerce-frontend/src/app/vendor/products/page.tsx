'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { vendorProductsApi, categoriesApi } from '@/lib/api';
import { Category } from '@/types';
import { formatPrice, getImageUrl } from '@/lib/utils';
import { useVendorStore } from '@/store/vendorStore';
import { useVendorAccess } from '@/hooks/useVendorAccess';
import { useAuthStore } from '@/store/authStore';
import {
  Plus, Pencil, Trash2, Images, Search, X, Upload, Package,
  CheckCircle, AlertCircle, Loader2, ToggleLeft, ToggleRight,
  ChevronLeft, ChevronRight, ImageOff, Tag,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────────────────

interface VendorProduct {
  id: number;
  name: string;
  price: number;
  discountPrice?: number;
  categoryName: string;
  isActive: boolean;
  stockQuantity?: number;
}

interface ProductForm {
  name: string;
  shortDescription: string;
  description: string;
  price: string;
  discountPrice: string;
  stockQuantity: string;
  categoryId: string;
  isActive: boolean;
}

interface UploadedImage {
  id: number;
  imageUrl: string;
  altText: string;
  displayOrder: number;
}

const EMPTY_FORM: ProductForm = {
  name: '', shortDescription: '', description: '', price: '', discountPrice: '', stockQuantity: '', categoryId: '', isActive: true,
};

function apiError(err: any, fallback: string): string {
  const status = err?.response?.status;
  if (!err?.response) return 'Cannot reach the server. Check your internet connection.';
  if (status === 401) return 'Your session has expired. Please log in again.';
  if (status === 403) return 'You don\'t have permission to do this.';
  if (status === 404) return 'Not found. Please refresh the page and try again.';
  if (status === 409) return err?.response?.data?.message || 'A conflict occurred. The item may already exist.';
  if (status >= 500) return 'Server error. Please try again in a moment.';
  // Extract ASP.NET Core validation errors (400)
  const data = err?.response?.data;
  if (data?.errors) {
    const messages = Object.values(data.errors as Record<string, string[]>).flat();
    if (messages.length > 0) return messages.join(' ');
  }
  return data?.message || data?.title || fallback;
}

// ── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium
      ${type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
      {type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      {message}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X size={14} /></button>
    </div>
  );
}

// ── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteModal({ name, onConfirm, onCancel, loading }: {
  name: string; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <Trash2 size={22} className="text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">Delete Product</h3>
        <p className="text-sm text-gray-500 mb-6">
          Are you sure you want to delete <strong>"{name}"</strong>? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Image Manager Panel ───────────────────────────────────────────────────────

function ImageManager({ product, onClose }: { product: VendorProduct; onClose: () => void }) {
  const { user } = useAuthStore();
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [existingUrls, setExistingUrls] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load existing images from product detail
  useEffect(() => {
    vendorProductsApi.getById(product.id)
      .then((r) => {
        const detail = r.data?.data || r.data;
        if (detail?.imageUrls) setExistingUrls(detail.imageUrls);
      })
      .catch(() => {});
  }, [product.id]);

  const uploadFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setToast({ message: 'Only image files are allowed.', type: 'error' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setToast({ message: 'Image must be under 10 MB.', type: 'error' });
      return;
    }
    setUploading(true);
    try {
      const res = await vendorProductsApi.uploadImage(product.id, file);
      const img: UploadedImage = res.data?.data || res.data;
      setUploadedImages((prev) => [...prev, img]);
      setToast({ message: 'Image uploaded successfully.', type: 'success' });
    } catch (err: any) {
      setToast({ message: apiError(err, 'Upload failed. Please try again.'), type: 'error' });
    } finally {
      setUploading(false);
    }
  }, [product.id]);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(uploadFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDeleteUploaded = async (img: UploadedImage) => {
    setDeletingId(img.id);
    try {
      await vendorProductsApi.deleteImage(product.id, img.id, user?.id);
      setUploadedImages((prev) => prev.filter((i) => i.id !== img.id));
      setToast({ message: 'Image deleted.', type: 'success' });
    } catch (err: any) {
      setToast({ message: apiError(err, 'Could not delete image. Please try again.'), type: 'error' });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Manage Images</h2>
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{product.name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6">
          {/* Upload zone */}
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-3">Upload New Images</p>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl flex flex-col items-center justify-center py-10 cursor-pointer transition-all
                ${dragging ? 'border-slate-400 bg-slate-50' : 'border-gray-200 bg-gray-50 hover:border-slate-300 hover:bg-slate-50/40'}`}
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              {uploading ? (
                <Loader2 size={32} className="text-slate-400 animate-spin mb-3" />
              ) : (
                <Upload size={32} className={`mb-3 transition-colors ${dragging ? 'text-slate-600' : 'text-gray-300'}`} />
              )}
              <p className="text-sm font-semibold text-slate-700">
                {uploading ? 'Uploading…' : 'Drag & drop images here'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                or <span className="text-slate-600 font-medium">click to browse</span> · JPG, PNG, WebP · Max 10 MB
              </p>
              <p className="text-[11px] text-gray-400 mt-2">
                Images are auto-optimised and stored on the server
              </p>
            </div>
          </div>

          {/* Newly uploaded in this session */}
          {uploadedImages.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-3">
                Uploaded this session
                <span className="ml-2 text-xs text-gray-400 font-normal">({uploadedImages.length})</span>
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {uploadedImages.map((img) => (
                  <div key={img.id} className="relative group rounded-xl overflow-hidden border border-gray-100 bg-gray-50 aspect-square">
                    <Image
                      src={getImageUrl(img.imageUrl)}
                      alt={img.altText}
                      fill
                      className="object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }}
                    />
                    <button
                      onClick={() => handleDeleteUploaded(img)}
                      disabled={deletingId === img.id}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-60"
                    >
                      {deletingId === img.id
                        ? <Loader2 size={11} className="animate-spin" />
                        : <X size={11} />}
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/40 py-1 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] text-white">#{img.displayOrder}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Existing images (URL-only from product detail) */}
          {existingUrls.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-1">Existing Images</p>
              <p className="text-xs text-gray-400 mb-3">Upload new images above to add more. Re-open panel to see all after saving.</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {existingUrls.map((url, i) => (
                  <div key={i} className="relative rounded-xl overflow-hidden border border-gray-100 bg-gray-50 aspect-square">
                    <Image
                      src={getImageUrl(url)}
                      alt={`Product image ${i + 1}`}
                      fill
                      className="object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {existingUrls.length === 0 && uploadedImages.length === 0 && !uploading && (
            <div className="text-center py-6 text-gray-400">
              <ImageOff size={36} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No images yet. Upload above to get started.</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
            Done
          </button>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// ── Inline Photos Section (used inside edit form) ───────────────────────────

function ProductPhotosSection({ productId }: { productId: number }) {
  const { user } = useAuthStore();
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [photoToast, setPhotoToast] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    vendorProductsApi.getById(productId)
      .then((r) => {
        const detail = r.data?.data || r.data;
        if (detail?.images) {
          setImages(detail.images);
        } else if (detail?.imageUrls) {
          setImages(detail.imageUrls.map((url: string, i: number) => ({
            id: i,
            imageUrl: url,
            altText: '',
            displayOrder: i + 1,
          })));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingImages(false));
  }, [productId]);

  const showPhotoToast = (msg: string) => {
    setPhotoToast(msg);
    setTimeout(() => setPhotoToast(''), 2500);
  };

  const uploadFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { showPhotoToast('Only image files allowed.'); return; }
    if (file.size > 10 * 1024 * 1024) { showPhotoToast('Image must be under 10 MB.'); return; }
    setUploading(true);
    try {
      const res = await vendorProductsApi.uploadImage(productId, file);
      const img: UploadedImage = res.data?.data || res.data;
      setImages((prev) => [...prev, img]);
    } catch (err: any) {
      showPhotoToast(apiError(err, 'Upload failed. Please try again.'));
    } finally {
      setUploading(false);
    }
  }, [productId]);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(uploadFile);
  };

  const handleDelete = async (img: UploadedImage) => {
    setDeletingId(img.id);
    try {
      await vendorProductsApi.deleteImage(productId, img.id, user?.id);
      setImages((prev) => prev.filter((i) => i.id !== img.id));
    } catch (err: any) {
      showPhotoToast(apiError(err, 'Could not delete photo. Please try again.'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="border-t border-gray-100 pt-4">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Product Photos
      </label>

      {photoToast && (
        <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg">
          {photoToast}
        </div>
      )}

      {/* Existing photos */}
      {loadingImages ? (
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
          <Loader2 size={12} className="animate-spin" /> Loading photos…
        </div>
      ) : images.length > 0 ? (
        <div className="grid grid-cols-4 gap-2 mb-3">
          {images.map((img) => (
            <div key={img.id} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
              <Image
                src={getImageUrl(img.imageUrl)}
                alt={img.altText || 'Product photo'}
                fill
                className="object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }}
              />
              <button
                type="button"
                onClick={() => handleDelete(img)}
                disabled={deletingId === img.id}
                className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-60"
              >
                {deletingId === img.id
                  ? <Loader2 size={9} className="animate-spin" />
                  : <X size={9} />}
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl flex items-center justify-center gap-3 py-4 cursor-pointer transition-all text-sm
          ${dragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
        />
        {uploading
          ? <Loader2 size={16} className="text-indigo-400 animate-spin" />
          : <Upload size={16} className="text-gray-400" />}
        <span className="text-gray-500 font-medium">
          {uploading ? 'Uploading…' : images.length > 0 ? 'Add more photos' : 'Upload photos'}
        </span>
        {!uploading && <span className="text-xs text-gray-400">JPG, PNG, WebP · Max 10 MB</span>}
      </div>
    </div>
  );
}

// ── Product Form Modal ────────────────────────────────────────────────────────

function ProductFormModal({
  mode, initial, categories, onSave, onClose, onCategoryAdded,
}: {
  mode: 'add' | 'edit';
  initial?: VendorProduct & { description?: string };
  categories: Category[];
  onSave: (form: ProductForm, pendingFiles: File[]) => Promise<void>;
  onClose: () => void;
  onCategoryAdded?: (cat: Category) => void;
}) {
  const [form, setForm] = useState<ProductForm>(
    initial
      ? {
          name: initial.name,
          shortDescription: (initial as any).shortDescription || '',
          description: (initial as any).description || '',
          price: String(initial.price),
          discountPrice: initial.discountPrice != null ? String(initial.discountPrice) : '',
          stockQuantity: String(initial.stockQuantity ?? ''),
          categoryId: String(
            categories.find((c) => c.name === initial.categoryName)?.id ?? ''
          ),
          isActive: initial.isActive,
        }
      : { ...EMPTY_FORM, categoryId: categories.length > 0 ? String(categories[0].id) : '' }
  );
  const [saving, setSaving] = useState(false);
  const [savingLabel, setSavingLabel] = useState('');
  const [error, setError] = useState('');

  const [localCategories, setLocalCategories] = useState<Category[]>(categories);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addCatLoading, setAddCatLoading] = useState(false);
  const [addCatError, setAddCatError] = useState('');

  // If the modal opened before categories finished loading, sync when they arrive
  useEffect(() => {
    if (localCategories.length === 0 && categories.length > 0) {
      setLocalCategories(categories);
      setForm((f) => ({ ...f, categoryId: f.categoryId || String(categories[0].id) }));
    }
  }, [categories.length]);

  // Pending images for add mode — stored locally until product is created
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [addDragging, setAddDragging] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => { previews.forEach(URL.revokeObjectURL); };
  }, [previews]);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const valid = Array.from(files).filter(
      (f) => f.type.startsWith('image/') && f.size <= 10 * 1024 * 1024
    );
    if (!valid.length) return;
    setPendingFiles((prev) => [...prev, ...valid]);
    setPreviews((prev) => [...prev, ...valid.map((f) => URL.createObjectURL(f))]);
  };

  const removeFile = (i: number) => {
    URL.revokeObjectURL(previews[i]);
    setPendingFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const set = (k: keyof ProductForm, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    setAddCatLoading(true);
    setAddCatError('');
    try {
      const res = await categoriesApi.create(name);
      const cat: Category = res.data?.data || res.data;
      setLocalCategories((prev) => [...prev, cat]);
      set('categoryId', String(cat.id));
      setAddingCategory(false);
      setNewCategoryName('');
      onCategoryAdded?.(cat);
    } catch (err: any) {
      setAddCatError(apiError(err, 'Failed to create category. Please try again.'));
    } finally {
      setAddCatLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Product name is required.'); return; }
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0) { setError('Enter a valid M.R.P.'); return; }
    if (form.discountPrice && Number(form.discountPrice) >= Number(form.price)) { setError('Sale price must be less than M.R.P.'); return; }
    if (!form.categoryId) { setError('Please select a category.'); return; }
    setError('');
    setSaving(true);
    setSavingLabel(pendingFiles.length > 0 ? 'Creating…' : '');
    try {
      await onSave(form, pendingFiles);
    } catch (err: any) {
      setError(apiError(err, mode === 'add' ? 'Failed to create product. Please try again.' : 'Failed to save changes. Please try again.'));
    } finally {
      setSaving(false);
      setSavingLabel('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-slate-900">
            {mode === 'add' ? 'Add New Product' : 'Edit Product'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Product Name <span className="text-orange-400">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Premium Wireless Headphones"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 transition-colors"
            />
          </div>

          {/* Short Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Short Description <span className="font-normal text-gray-400 normal-case">(shown on product card)</span>
            </label>
            <input
              type="text"
              value={form.shortDescription}
              onChange={(e) => set('shortDescription', e.target.value)}
              maxLength={120}
              placeholder="e.g. Noise-cancelling, 30hr battery, foldable design"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 transition-colors"
            />
            <p className="text-[11px] text-gray-400 mt-1">{form.shortDescription.length}/120 characters</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              placeholder="Describe your product..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 transition-colors resize-none"
            />
          </div>

          {/* Price + Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                M.R.P. (₹) <span className="text-orange-400">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Stock Qty</label>
              <input
                type="number"
                min="0"
                value={form.stockQuantity}
                onChange={(e) => set('stockQuantity', e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 transition-colors"
              />
            </div>
          </div>

          {/* Discount Price */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Sale Price (₹) <span className="text-xs font-normal text-gray-400 normal-case">— leave blank for no discount</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.discountPrice}
              onChange={(e) => set('discountPrice', e.target.value)}
              placeholder="e.g. 899.00"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 transition-colors"
            />
            {form.discountPrice && form.price && Number(form.discountPrice) >= Number(form.price) && (
              <p className="text-xs text-red-500 mt-1">Sale price must be less than M.R.P.</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Category <span className="text-orange-400">*</span>
            </label>
            <select
              value={form.categoryId}
              onChange={(e) => set('categoryId', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 transition-colors bg-white"
            >
              <option value="">Select a category</option>
              {localCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {!addingCategory ? (
              <button
                type="button"
                onClick={() => setAddingCategory(true)}
                className="mt-1.5 flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                <Tag size={11} /> Add new category
              </button>
            ) : (
              <div className="mt-2 space-y-1.5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => { setNewCategoryName(e.target.value); setAddCatError(''); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); } }}
                    placeholder="Category name"
                    autoFocus
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    disabled={addCatLoading || !newCategoryName.trim()}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1"
                  >
                    {addCatLoading && <Loader2 size={12} className="animate-spin" />}
                    {addCatLoading ? 'Adding…' : 'Add'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAddingCategory(false); setNewCategoryName(''); setAddCatError(''); }}
                    className="px-3 py-2 border border-gray-200 text-gray-500 hover:bg-gray-50 text-xs rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                {addCatError && <p className="text-xs text-red-500">{addCatError}</p>}
              </div>
            )}
          </div>

          {/* Active toggle (edit only) */}
          {mode === 'edit' && (
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-700">Product Status</p>
                <p className="text-xs text-gray-400">{form.isActive ? 'Visible to customers' : 'Hidden from store'}</p>
              </div>
              <button
                type="button"
                onClick={() => set('isActive', !form.isActive)}
                className="transition-colors"
              >
                {form.isActive
                  ? <ToggleRight size={32} className="text-slate-600" />
                  : <ToggleLeft size={32} className="text-gray-300" />}
              </button>
            </div>
          )}

          {/* Photos — queue for add mode, inline manager for edit mode */}
          {mode === 'add' ? (
            <div className="border-t border-gray-100 pt-4">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Product Photos
              </label>

              {previews.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {previews.map((src, i) => (
                    <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={9} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div
                onDragOver={(e) => { e.preventDefault(); setAddDragging(true); }}
                onDragLeave={() => setAddDragging(false)}
                onDrop={(e) => { e.preventDefault(); setAddDragging(false); addFiles(e.dataTransfer.files); }}
                onClick={() => addInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl flex items-center justify-center gap-3 py-4 cursor-pointer transition-all
                  ${addDragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}
              >
                <input
                  ref={addInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
                />
                <Upload size={16} className="text-gray-400" />
                <span className="text-gray-500 font-medium text-sm">
                  {previews.length > 0 ? 'Add more photos' : 'Add product photos'}
                </span>
                <span className="text-xs text-gray-400">JPG, PNG, WebP · Max 10 MB</span>
              </div>

              {pendingFiles.length > 0 && (
                <p className="text-xs text-gray-400 mt-2">
                  {pendingFiles.length} photo{pendingFiles.length > 1 ? 's' : ''} will upload when you create the product
                </p>
              )}
            </div>
          ) : (
            initial && <ProductPhotosSection productId={initial.id} />
          )}

          {error && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 text-amber-900 text-sm px-4 py-3 rounded-xl">
              <AlertCircle size={15} />
              {error}
            </div>
          )}
        </form>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit as any}
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving
              ? (savingLabel || 'Saving…')
              : mode === 'add' ? 'Create Product' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function VendorProductsPage() {
  const { designation } = useVendorStore();
  useVendorAccess('products', designation);
  const { isInitialized } = useAuthStore();

  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<VendorProduct | null>(null);
  const [imageTarget, setImageTarget] = useState<VendorProduct | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VendorProduct | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const PAGE_SIZE = 12;

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await vendorProductsApi.getAll({ pageNumber: page, pageSize: PAGE_SIZE });
      const data = res.data?.data || res.data;
      setProducts(data?.items || data || []);
      setTotalCount(data?.totalCount || 0);
    } catch (err: any) {
      setProducts([]);
      setToast({ message: apiError(err, 'Failed to load products. Please refresh the page.'), type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { if (isInitialized) loadProducts(); }, [loadProducts, isInitialized]);
  useEffect(() => {
    categoriesApi.getAll()
      .then((r) => setCategories(r.data?.data ?? r.data ?? []))
      .catch(() => {});
  }, []);

  const filtered = search.trim()
    ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : products;

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handleAdd = async (form: ProductForm, pendingFiles: File[]) => {
    const res = await vendorProductsApi.create({
      name: form.name,
      shortDescription: form.shortDescription || undefined,
      description: form.description,
      price: Number(form.price),
      discountPrice: (form.discountPrice && Number(form.discountPrice) > 0) ? Number(form.discountPrice) : undefined,
      stockQuantity: Number(form.stockQuantity) || 0,
      categoryId: Number(form.categoryId),
    });
    const created = res.data?.data || res.data;

    if (created?.id && pendingFiles.length > 0) {
      for (const file of pendingFiles) {
        try { await vendorProductsApi.uploadImage(created.id, file); } catch { /* skip failed uploads */ }
      }
    }

    setModal(null);
    loadProducts();
    setToast({ message: 'Product created successfully!', type: 'success' });
  };

  const handleEdit = async (form: ProductForm, _files: File[]) => {
    if (!editTarget) return;
    await vendorProductsApi.update(editTarget.id, {
      name: form.name,
      shortDescription: form.shortDescription || undefined,
      description: form.description,
      price: Number(form.price),
      discountPrice: (form.discountPrice && Number(form.discountPrice) > 0) ? Number(form.discountPrice) : undefined,
      stockQuantity: Number(form.stockQuantity) || 0,
      categoryId: Number(form.categoryId),
      isActive: form.isActive,
    });
    setModal(null);
    setEditTarget(null);
    setToast({ message: 'Product updated successfully!', type: 'success' });
    loadProducts();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await vendorProductsApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      setToast({ message: 'Product deleted.', type: 'success' });
      loadProducts();
    } catch (err: any) {
      setToast({ message: apiError(err, 'Could not delete product. Please try again.'), type: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const activeCount = products.filter((p) => p.isActive).length;
  const inactiveCount = products.length - activeCount;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Products</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your product catalogue</p>
        </div>
        <button
          onClick={() => setModal('add')}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
        >
          <Plus size={16} />
          Add Product
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Products', value: totalCount, color: 'text-slate-900' },
          { label: 'Active', value: activeCount, color: 'text-green-600' },
          { label: 'Inactive', value: inactiveCount, color: 'text-gray-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-2xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/5" />
                </div>
                <div className="h-4 bg-gray-100 rounded w-20" />
                <div className="h-6 bg-gray-100 rounded-full w-16" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Package size={40} className="mx-auto mb-3 text-gray-200" />
            <p className="text-slate-700 font-semibold">No products found</p>
            <p className="text-sm text-gray-400 mt-1">
              {search ? 'Try a different search term.' : 'Add your first product to get started.'}
            </p>
            {!search && (
              <button
                onClick={() => setModal('add')}
                className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2 rounded-xl text-sm transition-colors"
              >
                Add Product
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              <span>Product</span>
              <span className="w-28 text-right">Price</span>
              <span className="w-32 text-center">Category</span>
              <span className="w-20 text-center">Status</span>
              <span className="w-28 text-center">Actions</span>
            </div>

            <div className="divide-y divide-gray-50">
              {filtered.map((product) => (
                <div
                  key={product.id}
                  className="flex sm:grid sm:grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors"
                >
                  {/* Product name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex-shrink-0 flex items-center justify-center">
                      <Package size={16} className="text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{product.name}</p>
                      <p className="text-xs text-gray-400">ID #{product.id}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="w-28 text-right">
                    <span className="text-sm font-bold text-slate-900">{formatPrice(product.price)}</span>
                  </div>

                  {/* Category */}
                  <div className="w-32 text-center">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                      {product.categoryName || '—'}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="w-20 text-center">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full
                      ${product.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'}`}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="w-28 flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => { setEditTarget(product); setModal('edit'); }}
                      title="Edit product"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-slate-700 hover:bg-slate-50 transition-all"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => setImageTarget(product)}
                      title="Manage images"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-all"
                    >
                      <Images size={15} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(product)}
                      title="Delete product"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-gray-50">
                <p className="text-xs text-gray-400">
                  Page {page} of {totalPages} · {totalCount} products
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-40 hover:border-slate-400 transition-colors"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-40 hover:border-slate-400 transition-colors"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {modal === 'add' && (
        <ProductFormModal
          mode="add"
          categories={categories}
          onSave={handleAdd}
          onClose={() => setModal(null)}
          onCategoryAdded={(cat) => setCategories((prev) => [...prev, cat])}
        />
      )}

      {modal === 'edit' && editTarget && (
        <ProductFormModal
          mode="edit"
          initial={editTarget}
          categories={categories}
          onSave={handleEdit}
          onClose={() => { setModal(null); setEditTarget(null); }}
          onCategoryAdded={(cat) => setCategories((prev) => [...prev, cat])}
        />
      )}

      {imageTarget && (
        <ImageManager
          product={imageTarget}
          onClose={() => setImageTarget(null)}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          name={deleteTarget.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
