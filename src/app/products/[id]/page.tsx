'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { supabase, Product } from '@/lib/supabase';
import { addToCart } from '@/lib/cart';

export default function ProductDetailPage() {
  const params = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchProduct(params.id as string);
    }
  }, [params.id]);

  const fetchProduct = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setProduct(data);
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (product) {
      addToCart(product, quantity);
      setIsAdded(true);
      window.dispatchEvent(new Event('cartUpdated'));
      setTimeout(() => setIsAdded(false), 2000);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Không tìm thấy sản phẩm</h1>
        <Link href="/" className="btn-primary">
          Quay lại trang chủ
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm mb-8">
        <Link href="/" className="text-[var(--color-text-light)] hover:text-[var(--color-primary)]">
          Trang chủ
        </Link>
        <span className="text-[var(--color-text-light)]">/</span>
        <span className="text-[var(--color-text)]">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="relative aspect-square bg-[var(--color-bg-secondary)] rounded-2xl overflow-hidden">
            {product.images && product.images.length > 0 ? (
              <Image
                src={product.images[selectedImage]}
                alt={product.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[var(--color-text-light)]">
                <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>

          {/* Thumbnail Gallery */}
          {product.images && product.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${selectedImage === index
                    ? 'border-[var(--color-primary)]'
                    : 'border-transparent hover:border-[var(--color-primary-light)]'
                    }`}
                >
                  <Image src={image} alt="" fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          {product.category && (
            <span className="inline-block px-3 py-1 bg-[var(--color-primary-light)] text-[var(--color-primary-dark)] text-sm font-medium rounded-full">
              {product.category}
            </span>
          )}

          {product.sale_price && product.sale_price < product.price && (
            <span className="inline-block px-3 py-1 bg-orange-500 text-white text-sm font-bold rounded-full ml-2">
              SALE
            </span>
          )}

          <h1 className="text-3xl lg:text-4xl font-bold">{product.name}</h1>

          {product.sale_price && product.sale_price < product.price ? (
            <div className="flex items-baseline gap-3">
              <p className="text-3xl font-bold text-orange-600">
                {formatPrice(product.sale_price)}
              </p>
              <p className="text-xl text-[var(--color-text-light)] line-through">
                {formatPrice(product.price)}
              </p>
              <span className="px-2 py-1 bg-orange-100 text-orange-600 text-sm font-medium rounded">
                -{Math.round((1 - product.sale_price / product.price) * 100)}%
              </span>
            </div>
          ) : (
            <p className="text-3xl font-bold text-[var(--color-primary)]">
              {formatPrice(product.price)}
            </p>
          )}

          {/* Stock Status */}
          <div className="flex items-center gap-2">
            {product.stock > 0 ? (
              <>
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span className="text-green-600 font-medium">Còn {product.stock} sản phẩm</span>
              </>
            ) : (
              <>
                <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                <span className="text-red-600 font-medium">Hết hàng</span>
              </>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <div className="prose prose-lg max-w-none">
              <p className="text-[var(--color-text-light)] leading-relaxed">
                {product.description}
              </p>
            </div>
          )}

          {/* Quantity & Add to Cart */}
          {product.stock > 0 && (
            <div className="space-y-4 pt-4 border-t border-[var(--color-border)]">
              <div className="flex items-center gap-4">
                <span className="font-medium">Số lượng:</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 rounded-full border border-[var(--color-border)] flex items-center justify-center hover:bg-[var(--color-bg-secondary)] transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <span className="w-12 text-center font-bold text-lg">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="w-10 h-10 rounded-full border border-[var(--color-border)] flex items-center justify-center hover:bg-[var(--color-bg-secondary)] transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>

              <button
                onClick={handleAddToCart}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 ${isAdded
                  ? 'bg-green-500 text-white'
                  : 'gold-gradient text-white hover:shadow-lg transform hover:-translate-y-0.5'
                  }`}
              >
                {isAdded ? '✓ Đã thêm vào giỏ hàng' : 'Thêm vào giỏ hàng'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
