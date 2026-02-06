'use client';

import { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase, Product } from '@/lib/supabase';
import ProductCard from '@/components/ProductCard';
import BannerCarousel from '@/components/BannerCarousel';

const PRODUCTS_PER_PAGE = 9;

const PRICE_RANGES = [
  { id: 'under100k', label: 'Dưới 100.000đ', min: 0, max: 100000 },
  { id: '100k-300k', label: '100.000đ - 300.000đ', min: 100000, max: 300000 },
  { id: '300k-500k', label: '300.000đ - 500.000đ', min: 300000, max: 500000 },
  { id: '500k-1m', label: '500.000đ - 1 triệu', min: 500000, max: 1000000 },
  { id: 'over1m', label: 'Trên 1 triệu', min: 1000000, max: Infinity },
];

function HomePageContent() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const searchQuery = searchParams.get('q') || '';

  useEffect(() => {
    fetchProducts();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedPriceRanges]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      // If no price ranges selected, show all
      if (selectedPriceRanges.length === 0) {
        return matchesSearch;
      }

      // Check if product price falls in any selected range
      const matchesPrice = selectedPriceRanges.some((rangeId) => {
        const range = PRICE_RANGES.find((r) => r.id === rangeId);
        if (!range) return false;
        return product.price >= range.min && product.price < range.max;
      });

      return matchesSearch && matchesPrice;
    });
  }, [products, searchQuery, selectedPriceRanges]);

  // Pagination logic
  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const triggerCartUpdate = () => {
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    window.scrollTo({ top: 400, behavior: 'smooth' });
  };

  const togglePriceRange = useCallback((rangeId: string) => {
    setSelectedPriceRanges((prev) =>
      prev.includes(rangeId)
        ? prev.filter((id) => id !== rangeId)
        : [...prev, rangeId]
    );
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedPriceRanges([]);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[var(--color-text-light)]">Đang tải sản phẩm...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Banner Carousel */}
      <BannerCarousel />

      {/* Main Content with Sidebar */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Filter */}
        <aside className="lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm p-5 sticky top-24">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[var(--color-text)]">Bộ lọc</h3>
              {selectedPriceRanges.length > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-[var(--color-primary)] hover:underline"
                >
                  Xóa tất cả
                </button>
              )}
            </div>

            {/* Price Filter */}
            <div>
              <h4 className="text-sm font-medium text-[var(--color-text-light)] mb-3">
                Mức giá
              </h4>
              <div className="space-y-2">
                {PRICE_RANGES.map((range) => (
                  <label
                    key={range.id}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPriceRanges.includes(range.id)}
                      onChange={() => togglePriceRange(range.id)}
                      className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer"
                    />
                    <span className="text-sm text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
                      {range.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Products Section */}
        <div className="flex-1">
          {/* Search Result Info */}
          {searchQuery && (
            <div className="mb-6">
              <p className="text-[var(--color-text-light)]">
                Kết quả tìm kiếm cho: <span className="font-medium text-[var(--color-text)]">"{searchQuery}"</span>
                {' '}({filteredProducts.length} sản phẩm)
              </p>
            </div>
          )}

          {/* Products Count */}
          {!searchQuery && (
            <div className="mb-6 flex items-center justify-between">
              <p className="text-[var(--color-text-light)]">
                Hiển thị {paginatedProducts.length} / {filteredProducts.length} sản phẩm
              </p>
              {selectedPriceRanges.length > 0 && (
                <p className="text-sm text-[var(--color-primary)]">
                  {selectedPriceRanges.length} bộ lọc đang áp dụng
                </p>
              )}
            </div>
          )}

          {/* Products Grid */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <svg
                className="w-24 h-24 mx-auto text-[var(--color-text-light)] mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-xl text-[var(--color-text-light)]">
                Không tìm thấy sản phẩm nào
              </p>
              {selectedPriceRanges.length > 0 && (
                <button
                  onClick={clearFilters}
                  className="mt-4 text-[var(--color-primary)] hover:underline"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={triggerCartUpdate}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages >= 1 && (
                <div className="flex justify-center items-center gap-2 mt-12">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => goToPage(page)}
                          className={`w-10 h-10 rounded-lg font-medium transition-colors ${page === currentPage
                            ? 'bg-[var(--color-primary)] text-white'
                            : 'border border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]'
                            }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return <span key={page} className="px-1">...</span>;
                    }
                    return null;
                  })}

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <HomePageContent />
    </Suspense>
  );
}
