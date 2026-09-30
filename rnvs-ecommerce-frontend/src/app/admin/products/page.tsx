'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, Trash2, Loader2, ImageOff, ExternalLink, Plus, ShieldAlert, Package, ChevronRight } from 'lucide-react';
import { productsApi, vendorProductsApi, bannedWordsApi } from '@/lib/api';
import { getImageUrl } from '@/lib/utils';

interface BannedWord {
  id: number;
  word: string;
}

function BannedWordsManager() {
  const [words, setWords] = useState<BannedWord[]>([]);
  const [newWord, setNewWord] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    bannedWordsApi.getAll()
      .then((r) => setWords(r.data?.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const addWord = async () => {
    const word = newWord.trim();
    if (!word) return;
    setAdding(true);
    setError('');
    try {
      const res = await bannedWordsApi.add(word);
      const added = res.data?.data;
      setWords((prev) => [...prev, { id: added.id, word: added.word }].sort((a, b) => a.word.localeCompare(b.word)));
      setNewWord('');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not add word.');
    } finally {
      setAdding(false);
    }
  };

  const removeWord = async (id: number) => {
    try {
      await bannedWordsApi.delete(id);
      setWords((prev) => prev.filter((w) => w.id !== id));
    } catch {
      // leave it in place on failure
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 p-6 mb-6">
      <div className="flex items-center gap-2 mb-1">
        <ShieldAlert size={16} className="text-red-500" />
        <h2 className="font-display tracking-tight text-base text-neutral-900">Banned Words</h2>
      </div>
      <p className="text-xs text-neutral-400 mb-4">Products whose name or description contains any of these words are automatically hidden and sent for review.</p>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newWord}
          onChange={(e) => setNewWord(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addWord(); }}
          placeholder="Add a word..."
          className="flex-1 px-3 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-900 transition-colors"
        />
        <button
          onClick={addWord}
          disabled={adding || !newWord.trim()}
          className="flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors"
        >
          {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Add
        </button>
      </div>
      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

      {loading ? (
        <p className="text-xs text-neutral-400">Loading…</p>
      ) : words.length === 0 ? (
        <p className="text-xs text-neutral-400">No banned words yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {words.map((w) => (
            <span key={w.id} className="flex items-center gap-1.5 bg-neutral-50 border border-neutral-200 text-neutral-700 text-xs font-medium px-3 py-1.5 rounded-full">
              {w.word}
              <button onClick={() => removeWord(w.id)} className="text-neutral-400 hover:text-red-500 transition-colors">
                <Trash2 size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

interface RemovedImageRecord {
  id: number;
  vendorName: string;
  productId: number;
  productName: string;
  archivedImagePath: string;
  removedBy: string;
  removedAt: string;
}

function RemovedImagesHistory({ refreshKey }: { refreshKey: number }) {
  const [records, setRecords] = useState<RemovedImageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    vendorProductsApi.getRemovedImages()
      .then((r) => setRecords(r.data?.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const approve = async (record: RemovedImageRecord) => {
    setRestoringId(record.id);
    try {
      await vendorProductsApi.restoreImage(record.id);
      setRecords((prev) => prev.filter((r) => r.id !== record.id));
    } catch {
      // leave it in the list on failure
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <ImageOff size={16} className="text-neutral-500" />
        <h2 className="font-display tracking-tight text-base text-neutral-800">Removed Images</h2>
        <span className="text-xs text-neutral-400 font-medium">Images taken down from products via moderation</span>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
        {loading ? (
          <div className="py-10 flex items-center justify-center">
            <Loader2 size={20} className="animate-spin text-neutral-300" />
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-10">
            <ImageOff size={28} className="mx-auto mb-2 text-neutral-200" />
            <p className="text-sm text-neutral-400">No images have been removed yet.</p>
          </div>
        ) : (
          <>
            <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-3 px-5 py-3 border-b border-neutral-100 text-xs font-semibold text-neutral-600 uppercase tracking-wide">
              <span>Product / Vendor</span>
              <span className="w-40 text-center">Removed By</span>
              <span className="w-36 text-right">Removed On</span>
              <span className="w-24 text-center">Approve</span>
            </div>
            <div className="divide-y divide-neutral-50">
              {records.map((r) => (
                <div key={r.id} className="flex sm:grid sm:grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-5 py-3.5 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden border border-neutral-200 bg-neutral-50">
                      <img src={getImageUrl(r.archivedImagePath)} alt={r.productName} className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-neutral-800 truncate">{r.productName}</p>
                      <p className="text-xs text-neutral-500 truncate">{r.vendorName}</p>
                    </div>
                  </div>
                  <div className="w-40 text-center">
                    <span className="text-xs font-semibold text-neutral-600 truncate">{r.removedBy}</span>
                  </div>
                  <div className="w-36 text-right">
                    <span className="text-xs font-semibold text-red-500">{new Date(r.removedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div className="w-24 flex justify-center">
                    <button
                      onClick={() => approve(r)}
                      disabled={restoringId === r.id}
                      className="flex items-center gap-1.5 text-xs font-semibold text-green-600 hover:text-green-700 px-2.5 py-1.5 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50"
                      title="Approve — put this image back on the storefront"
                    >
                      {restoringId === r.id && <Loader2 size={13} className="animate-spin" />}
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface SearchHit {
  productId: string;
  vendorId: string;
  title: string;
  vendorName: string;
  imageUrl: string;
  imageId?: number;
  isActive: boolean;
}

interface ProductImage {
  id: number;
  imagePath: string;
}

interface ProductDetail {
  id: number;
  name: string;
  vendorName: string;
  vendorId: string;
  images: ProductImage[];
}

// Flat shape so the "remove this image" confirmation works the same whether
// triggered from a row's thumbnail directly, or from inside the detail view.
interface ConfirmImageTarget {
  id: number;
  imagePath: string;
  productId: number;
  vendorId: string;
  productName: string;
  vendorName: string;
}

export default function AdminProductsPage() {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [browsing, setBrowsing] = useState(true); // true = showing the default "browse all" list, not search results
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<ProductDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [confirmImage, setConfirmImage] = useState<ConfirmImageTarget | null>(null);
  const [confirmRemoveProduct, setConfirmRemoveProduct] = useState<SearchHit | null>(null);
  const [removingProductId, setRemovingProductId] = useState<string | null>(null);
  const [activatingProductId, setActivatingProductId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Default list shown on load, so admins can browse visually without already knowing a product's name
  const loadBrowseList = (includeInactive: boolean) => {
    setSearching(true);
    productsApi.getAll({ pageSize: 40, pageNumber: 1, includeInactive })
      .then((r) => {
        const raw = r.data?.data ?? r.data ?? {};
        const items: any[] = raw?.items ?? (Array.isArray(raw) ? raw : []);
        setHits(items.map((p) => ({
          productId: String(p.id),
          vendorId: p.vendorId ?? '',
          title: p.name,
          vendorName: p.vendorName ?? '',
          imageUrl: p.primaryImageUrl ?? '',
          imageId: p.primaryImageId ?? undefined,
          isActive: p.isActive ?? true,
        })));
      })
      .catch(() => setHits([]))
      .finally(() => setSearching(false));
  };

  useEffect(() => { loadBrowseList(showInactive); }, [showInactive]);

  const runSearch = (value: string) => {
    setQuery(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (!value.trim()) { setBrowsing(true); loadBrowseList(showInactive); return; }
    setBrowsing(false);
    debounceTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await productsApi.search(value.trim(), { pageSize: 10 });
        const results: any[] = res.data?.data ?? [];
        setHits(results.map((r) => {
          const composite: string = r.id ?? '';
          const underscoreIdx = composite.indexOf('_');
          return {
            productId: r.productId ?? '',
            vendorId: underscoreIdx > -1 ? composite.slice(0, underscoreIdx) : '',
            title: r.title,
            vendorName: r.vendorName ?? '',
            imageUrl: r.imageUrl ?? '',
            isActive: true, // search index only ever contains active products
          };
        }));
      } catch {
        setHits([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const openProduct = async (hit: SearchHit) => {
    setLoadingDetail(true);
    setSelected(null);
    try {
      const res = await vendorProductsApi.getById(Number(hit.productId), hit.vendorId);
      const detail = res.data?.data ?? res.data;
      setSelected({
        id: detail.id,
        name: detail.name,
        vendorName: detail.vendorName,
        vendorId: hit.vendorId,
        images: detail.images ?? [],
      });
    } catch {
      setSelected(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const removeImage = async (target: ConfirmImageTarget) => {
    setRemovingId(target.id);
    try {
      await vendorProductsApi.deleteImage(target.productId, target.id, target.vendorId);
      // Update the detail view, if this product happens to be open
      setSelected((prev) => prev && prev.id === target.productId && prev.vendorId === target.vendorId
        ? { ...prev, images: prev.images.filter((i) => i.id !== target.id) }
        : prev);
      // Clear the thumbnail from the row in the list, since that image is gone now
      setHits((prev) => prev.map((h) =>
        h.productId === String(target.productId) && h.vendorId === target.vendorId
          ? { ...h, imageUrl: '', imageId: undefined }
          : h));
      setHistoryRefreshKey((k) => k + 1);
    } catch {
      // leave the image in place; nothing to recover from on failure
    } finally {
      setRemovingId(null);
      setConfirmImage(null);
    }
  };

  const removeProduct = async (hit: SearchHit) => {
    setRemovingProductId(hit.productId);
    try {
      await vendorProductsApi.delete(Number(hit.productId), hit.vendorId);
      setHits((prev) => prev.filter((h) => !(h.vendorId === hit.vendorId && h.productId === hit.productId)));
      if (selected && String(selected.id) === hit.productId && selected.vendorId === hit.vendorId) {
        setSelected(null);
      }
      setHistoryRefreshKey((k) => k + 1);
    } catch {
      // leave the product as-is on failure
    } finally {
      setRemovingProductId(null);
      setConfirmRemoveProduct(null);
    }
  };

  const activateProduct = async (hit: SearchHit) => {
    setActivatingProductId(hit.productId);
    try {
      await vendorProductsApi.activate(Number(hit.productId), hit.vendorId);
      setHits((prev) => prev.map((h) =>
        h.vendorId === hit.vendorId && h.productId === hit.productId
          ? { ...h, isActive: true }
          : h));
    } catch {
      // leave as-is on failure
    } finally {
      setActivatingProductId(null);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-[0.3em] text-neutral-500">Admin</div>
        <h1 className="font-display tracking-tight text-3xl lg:text-4xl mt-1 text-neutral-900">Product Moderation</h1>
        <p className="text-sm text-neutral-500 mt-0.5">Hover a photo below and click the trash icon to remove just that image, or use the row's Remove button to take down the whole product.</p>
      </div>

      <BannedWordsManager />
      <RemovedImagesHistory refreshKey={historyRefreshKey} />

      {/* Search */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => runSearch(e.target.value)}
            placeholder="Search by product name..."
            className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-900 transition-colors bg-white"
          />
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-neutral-600 whitespace-nowrap cursor-pointer">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)}
            className="w-4 h-4 accent-neutral-900 cursor-pointer" />
          Show removed products too
        </label>
      </div>

      {/* Results */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Package size={16} className="text-neutral-500" />
          <h2 className="font-display tracking-tight text-base text-neutral-800">{browsing ? 'All Products' : 'Search Results'}</h2>
          <span className="text-xs text-neutral-400 font-medium">{browsing ? 'Browse visually, or search by name above' : `Results for "${query}"`}</span>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
          {searching ? (
            <div className="py-10 flex items-center justify-center">
              <Loader2 size={20} className="animate-spin text-neutral-300" />
            </div>
          ) : hits.length === 0 ? (
            <div className="text-center py-10">
              <Package size={28} className="mx-auto mb-2 text-neutral-200" />
              <p className="text-sm text-neutral-400">No products found.</p>
            </div>
          ) : (
            <>
              <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-3 px-5 py-3 border-b border-neutral-100 text-xs font-semibold text-neutral-600 uppercase tracking-wide">
                <span>Product (hover photo to remove it)</span>
                <span className="w-48 text-center">Vendor</span>
                <span className="w-12 text-center">View</span>
                <span className="w-28 text-center">Product</span>
              </div>
              <div className="divide-y divide-neutral-50">
                {hits.map((hit) => (
                  <div
                    key={`${hit.vendorId}_${hit.productId}`}
                    className={`flex sm:grid sm:grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-5 py-3.5 transition-colors ${hit.isActive ? 'hover:bg-neutral-100/30' : 'bg-red-50/30'}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative group w-10 h-10 rounded-lg bg-neutral-50 border border-neutral-100 overflow-hidden flex-shrink-0">
                        <img src={getImageUrl(hit.imageUrl)} alt={hit.title} className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }} />
                        {hit.imageId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmImage({ id: hit.imageId!, imagePath: hit.imageUrl, productId: Number(hit.productId), vendorId: hit.vendorId, productName: hit.title, vendorName: hit.vendorName });
                            }}
                            className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
                            title="Remove this photo"
                          >
                            <Trash2 size={14} className="text-white" />
                          </button>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-neutral-900 truncate">{hit.title}</p>
                        {!hit.isActive && <span className="text-[10px] font-semibold text-red-500 uppercase">Removed</span>}
                      </div>
                    </div>
                    <div className="w-48 text-center">
                      <span className="text-xs font-semibold text-neutral-600 truncate">{hit.vendorName}</span>
                    </div>
                    <div className="w-12 flex justify-center">
                      <button onClick={() => openProduct(hit)} className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-950 hover:bg-neutral-100 transition-colors" title="View all photos">
                        <ChevronRight size={15} />
                      </button>
                    </div>
                    <div className="w-28 flex justify-center">
                      {hit.isActive ? (
                        <button
                          onClick={() => setConfirmRemoveProduct(hit)}
                          disabled={removingProductId === hit.productId}
                          className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-600 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          title="Remove product"
                        >
                          {removingProductId === hit.productId ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                          Remove
                        </button>
                      ) : (
                        <button
                          onClick={() => activateProduct(hit)}
                          disabled={activatingProductId === hit.productId}
                          className="flex items-center gap-1.5 text-xs font-semibold text-green-600 hover:text-green-700 px-2.5 py-1.5 rounded-lg hover:bg-green-50 transition-colors"
                          title="Make this product visible again"
                        >
                          {activatingProductId === hit.productId && <Loader2 size={13} className="animate-spin" />}
                          Activate
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Selected product's images */}
      {loadingDetail && (
        <div className="flex items-center gap-2 text-sm text-neutral-400">
          <Loader2 size={14} className="animate-spin" /> Loading product…
        </div>
      )}

      {selected && (
        <div className="bg-white rounded-2xl border border-neutral-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display tracking-tight text-base text-neutral-900">{selected.name}</h2>
              <p className="text-xs text-neutral-400 mt-0.5">Sold by {selected.vendorName}</p>
            </div>
            <a
              href={`/products/${selected.id}?v=${encodeURIComponent(selected.vendorId)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold text-neutral-900 hover:text-neutral-950"
            >
              View live <ExternalLink size={12} />
            </a>
          </div>

          {selected.images.length === 0 ? (
            <p className="text-sm text-neutral-400 flex items-center gap-2"><ImageOff size={14} /> No images on this product.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {selected.images.map((img) => (
                <div key={img.id} className="relative group">
                  <div className="aspect-square rounded-xl overflow-hidden border border-neutral-200 bg-neutral-50">
                    <img src={getImageUrl(img.imagePath)} alt="" className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }} />
                  </div>
                  <button
                    onClick={() => setConfirmImage({ id: img.id, imagePath: img.imagePath, productId: selected.id, vendorId: selected.vendorId, productName: selected.name, vendorName: selected.vendorName })}
                    disabled={removingId === img.id}
                    className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-xl"
                  >
                    <span className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                      {removingId === img.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      Remove
                    </span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirm before removing */}
      {confirmImage && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-base font-semibold text-neutral-900 mb-1">Remove this image?</h3>
            <p className="text-sm text-neutral-500 mb-4">This will hide it from the listing immediately. The file is archived, not deleted, so it can be recovered if needed.</p>

            <div className="flex items-center gap-3 bg-neutral-50 border border-neutral-100 rounded-xl p-3 mb-5">
              <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden border border-neutral-200 bg-white">
                <img src={getImageUrl(confirmImage.imagePath)} alt="" className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-neutral-800 truncate">{confirmImage.productName}</p>
                <p className="text-xs text-neutral-400 truncate">Sold by {confirmImage.vendorName}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setConfirmImage(null)}
                className="flex-1 px-4 py-2.5 border border-neutral-200 rounded-xl text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => removeImage(confirmImage)}
                disabled={removingId === confirmImage.id}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                {removingId === confirmImage.id && <Loader2 size={14} className="animate-spin" />}
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm before removing an entire product */}
      {confirmRemoveProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-base font-semibold text-neutral-900 mb-1">Remove this product?</h3>
            <p className="text-sm text-neutral-500 mb-4">This takes the product off the storefront immediately. It is deactivated, not deleted — the vendor's data is preserved.</p>

            <div className="flex items-center gap-3 bg-neutral-50 border border-neutral-100 rounded-xl p-3 mb-5">
              <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden border border-neutral-200 bg-white">
                <img src={getImageUrl(confirmRemoveProduct.imageUrl)} alt="" className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-neutral-800 truncate">{confirmRemoveProduct.title}</p>
                <p className="text-xs text-neutral-400 truncate">Sold by {confirmRemoveProduct.vendorName}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setConfirmRemoveProduct(null)}
                className="flex-1 px-4 py-2.5 border border-neutral-200 rounded-xl text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => removeProduct(confirmRemoveProduct)}
                disabled={removingProductId === confirmRemoveProduct.productId}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                {removingProductId === confirmRemoveProduct.productId && <Loader2 size={14} className="animate-spin" />}
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
