'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { CartItem, getCart, getCartTotal, clearCart, getItemPrice } from '@/lib/cart';
import { sendTelegramNotification } from '@/lib/telegram';

type PaymentMethod = 'cod' | 'bank_transfer';

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [completedOrderData, setCompletedOrderData] = useState<{
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    customerAddress: string;
    items: { name: string; quantity: number; price: number; salePrice: number | null }[];
    total: number;
    paymentMethod: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    customer_address: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });

  // Auto hide toast after 4 seconds
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast({ show: false, message: '' });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  useEffect(() => {
    setMounted(true);
    const cartData = getCart();
    setCart(cartData);

    if (cartData.length === 0) {
      router.push('/cart');
    }
  }, [router]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validate họ tên
    if (!formData.customer_name.trim()) {
      newErrors.customer_name = 'Vui lòng nhập họ tên';
    } else if (formData.customer_name.trim().length < 2) {
      newErrors.customer_name = 'Họ tên phải có ít nhất 2 ký tự';
    }

    // Validate số điện thoại Việt Nam
    const phoneNumber = formData.customer_phone.replace(/[\s\-\.]/g, '');
    if (!phoneNumber) {
      newErrors.customer_phone = 'Vui lòng nhập số điện thoại';
    } else if (!/^(0|84|\+84)/.test(phoneNumber)) {
      newErrors.customer_phone = 'Số điện thoại phải bắt đầu bằng 0 hoặc +84';
    } else if (!/^(0|84|\+84)[3-9][0-9]{8}$/.test(phoneNumber)) {
      newErrors.customer_phone = 'Số điện thoại không hợp lệ (10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09)';
    }

    // Validate email (nếu có nhập)
    if (formData.customer_email) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(formData.customer_email)) {
        newErrors.customer_email = 'Email không hợp lệ (ví dụ: abc@gmail.com)';
      }
    }

    // Validate địa chỉ
    if (!formData.customer_address.trim()) {
      newErrors.customer_address = 'Vui lòng nhập địa chỉ giao hàng';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      setToast({
        show: true,
        message: 'Vui lòng kiểm tra lại thông tin đơn hàng!',
      });
      return;
    }

    setLoading(true);

    try {
      const total = getCartTotal(cart);

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: formData.customer_name,
          customer_phone: formData.customer_phone,
          customer_email: formData.customer_email || null,
          customer_address: formData.customer_address,
          total: total,
          status: 'pending',
          payment_method: paymentMethod,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cart.map((item) => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price,
        sale_price: item.product.sale_price && item.product.sale_price < item.product.price
          ? item.product.sale_price
          : null,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Send Telegram notification
      await sendTelegramNotification({
        orderId: order.id,
        customerName: formData.customer_name,
        customerPhone: formData.customer_phone,
        customerEmail: formData.customer_email || undefined,
        customerAddress: formData.customer_address,
        items: cart.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
          salePrice: item.product.sale_price && item.product.sale_price < item.product.price
            ? item.product.sale_price
            : null,
        })),
        total: total,
        paymentMethod: paymentMethod === 'cod' ? 'Thanh toán khi nhận hàng' : 'Chuyển khoản ngân hàng',
      });

      // Save order data before clearing cart
      setCompletedOrderData({
        customerName: formData.customer_name,
        customerPhone: formData.customer_phone,
        customerEmail: formData.customer_email,
        customerAddress: formData.customer_address,
        items: cart.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
          salePrice: item.product.sale_price && item.product.sale_price < item.product.price
            ? item.product.sale_price
            : null,
        })),
        total: total,
        paymentMethod: paymentMethod === 'cod' ? 'Thanh toán khi nhận hàng' : 'Chuyển khoản ngân hàng',
      });

      // Clear cart and show success
      clearCart();
      window.dispatchEvent(new Event('cartUpdated'));
      setOrderId(order.id);
      setOrderSuccess(true);
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Có lỗi xảy ra khi đặt hàng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (orderSuccess && completedOrderData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold mb-2">Đặt hàng thành công!</h1>
            <p className="text-[var(--color-text-light)]">Cảm ơn bạn đã đặt hàng. Chúng tôi sẽ liên hệ với bạn sớm nhất.</p>
          </div>

          {/* Order Details Card */}
          <div className="bg-white rounded-xl shadow-md border border-[var(--color-border)] p-6 mb-6">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--color-border)]">
              <h2 className="text-xl font-bold">Chi tiết đơn hàng</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono bg-[var(--color-bg-secondary)] px-3 py-1 rounded-lg">{orderId}</span>
                <div className="relative group">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(orderId || '');
                      const icon = document.getElementById('copy-icon');
                      if (icon) {
                        icon.className = 'fa-solid fa-check text-green-500';
                        setTimeout(() => { icon.className = 'fa-solid fa-copy'; }, 1500);
                      }
                    }}
                    className="p-2 hover:bg-[var(--color-bg-secondary)] rounded-lg transition-colors text-[var(--color-text-light)] hover:text-[var(--color-primary)]"
                  >
                    <i id="copy-icon" className="fa-solid fa-copy"></i>
                  </button>
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                    Copy
                  </span>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="mb-6">
              <h3 className="font-semibold text-[var(--color-text-light)] mb-3">Thông tin khách hàng</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-[var(--color-text-light)]">Họ tên:</span>
                  <p className="font-medium">{completedOrderData.customerName}</p>
                </div>
                <div>
                  <span className="text-[var(--color-text-light)]">Số điện thoại:</span>
                  <p className="font-medium">{completedOrderData.customerPhone}</p>
                </div>
                {completedOrderData.customerEmail && (
                  <div>
                    <span className="text-[var(--color-text-light)]">Email:</span>
                    <p className="font-medium">{completedOrderData.customerEmail}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <span className="text-[var(--color-text-light)]">Địa chỉ:</span>
                  <p className="font-medium">{completedOrderData.customerAddress}</p>
                </div>
              </div>
            </div>

            {/* Products */}
            <div className="mb-6">
              <h3 className="font-semibold text-[var(--color-text-light)] mb-3">Sản phẩm</h3>
              <div className="space-y-3">
                {completedOrderData.items.map((item, index) => {
                  const effectivePrice = item.salePrice || item.price;
                  const hasSalePrice = item.salePrice !== null;
                  return (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-[var(--color-border)] last:border-0">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-[var(--color-text-light)]">
                          {hasSalePrice ? (
                            <>
                              <span className="text-orange-600 font-medium">{formatPrice(item.salePrice!)}</span>
                              <span className="line-through ml-1">{formatPrice(item.price)}</span>
                              <span> x {item.quantity}</span>
                            </>
                          ) : (
                            <>{formatPrice(item.price)} x {item.quantity}</>
                          )}
                        </p>
                      </div>
                      <p className={`font-bold ${hasSalePrice ? 'text-orange-600' : ''}`}>
                        {formatPrice(effectivePrice * item.quantity)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payment & Total */}
            <div className="pt-4 border-t border-[var(--color-border)]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[var(--color-text-light)]">Thanh toán:</span>
                <span className="font-medium">{completedOrderData.paymentMethod}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg">Tổng cộng:</span>
                <span className="font-bold text-xl text-[var(--color-primary)]">{formatPrice(completedOrderData.total)}</span>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Link href="/" className="btn-primary inline-block">
              Tiếp tục mua sắm
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const total = getCartTotal(cart);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Đặt hàng</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Checkout Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Shipping Info */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-[var(--color-border)]">
              <h2 className="text-xl font-bold mb-6">Thông tin giao hàng</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="customer_name"
                    value={formData.customer_name}
                    onChange={handleInputChange}
                    className={`input-field ${errors.customer_name ? 'border-red-500 focus:ring-red-500' : ''}`}
                    placeholder="Nguyễn Văn A"
                  />
                  {errors.customer_name && (
                    <p className="text-red-500 text-sm mt-1">{errors.customer_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="customer_phone"
                    value={formData.customer_phone}
                    onChange={handleInputChange}
                    className={`input-field ${errors.customer_phone ? 'border-red-500 focus:ring-red-500' : ''}`}
                    placeholder="0912345678"
                  />
                  {errors.customer_phone && (
                    <p className="text-red-500 text-sm mt-1">{errors.customer_phone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    name="customer_email"
                    value={formData.customer_email}
                    onChange={handleInputChange}
                    className={`input-field ${errors.customer_email ? 'border-red-500 focus:ring-red-500' : ''}`}
                    placeholder="email@example.com"
                  />
                  {errors.customer_email && (
                    <p className="text-red-500 text-sm mt-1">{errors.customer_email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Địa chỉ giao hàng <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="customer_address"
                    value={formData.customer_address}
                    onChange={handleInputChange}
                    rows={3}
                    className={`input-field resize-none ${errors.customer_address ? 'border-red-500 focus:ring-red-500' : ''}`}
                    placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                  />
                  {errors.customer_address && (
                    <p className="text-red-500 text-sm mt-1">{errors.customer_address}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-[var(--color-border)]">
              <h2 className="text-xl font-bold mb-6">Hình thức thanh toán</h2>

              <div className="space-y-4">
                {/* COD Option */}
                <label
                  className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${paymentMethod === 'cod'
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                    : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
                    }`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                    className="mt-1 w-5 h-5 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <svg className="w-6 h-6 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span className="font-semibold">Thanh toán khi nhận hàng (COD)</span>
                    </div>
                    <p className="text-sm text-[var(--color-text-light)] mt-1">
                      Thanh toán bằng tiền mặt khi nhận được hàng
                    </p>
                  </div>
                </label>

                {/* Bank Transfer Option */}
                <label
                  className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${paymentMethod === 'bank_transfer'
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                    : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
                    }`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value="bank_transfer"
                    checked={paymentMethod === 'bank_transfer'}
                    onChange={() => setPaymentMethod('bank_transfer')}
                    className="mt-1 w-5 h-5 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <svg className="w-6 h-6 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      <span className="font-semibold">Chuyển khoản ngân hàng</span>
                    </div>
                    <p className="text-sm text-[var(--color-text-light)] mt-1">
                      Chuyển khoản trước khi nhận hàng
                    </p>
                  </div>
                </label>

                {/* QR Code for Bank Transfer */}
                {paymentMethod === 'bank_transfer' && (
                  <div className="mt-4 p-6 bg-[var(--color-bg-secondary)] rounded-lg">
                    {/* Transfer Content - Prominent */}
                    <div className="mb-6 p-4 bg-red-50 border-2 border-red-500 rounded-lg">
                      <p className="text-center font-bold text-lg text-red-600">
                        📝 Nội dung chuyển khoản
                      </p>
                      <p className="text-center text-lg font-mono font-bold mt-2 text-black">
                        SĐT + Tên khách hàng
                      </p>
                      <p className="text-center text-sm text-black mt-1">
                        Ví dụ: 0912345678 Nguyen Van A
                      </p>
                      <p className="text-center text-sm text-black mt-1 italic">
                        Chúng tôi sẽ liên hệ với bạn để xác nhận đơn hàng sau khi nhận được thanh toán
                      </p>
                    </div>

                    <p className="text-center font-medium mb-4">Quét mã QR để thanh toán</p>
                    <div className="flex justify-center">
                      <div className="relative w-96 h-96 bg-white rounded-lg p-3 shadow-lg">
                        <Image
                          src="/img/qrcode/photo_2026-02-06 14.55.44.jpeg"
                          alt="QR Code thanh toán"
                          fill
                          className="object-contain p-2"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Đang xử lý...
                </span>
              ) : (
                'Xác nhận đặt hàng'
              )}
            </button>
          </form>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-md p-6 border border-[var(--color-border)] sticky top-24">
            <h2 className="text-xl font-bold mb-6">Đơn hàng của bạn</h2>

            <div className="space-y-4 mb-6">
              {cart.map((item) => {
                const hasSalePrice = item.product.sale_price && item.product.sale_price < item.product.price;
                const itemPrice = getItemPrice(item.product);
                return (
                  <div key={item.product.id} className="flex gap-3">
                    <div className="relative w-16 h-16 bg-[var(--color-bg-secondary)] rounded-lg overflow-hidden flex-shrink-0">
                      {item.product.images && item.product.images.length > 0 ? (
                        <Image
                          src={item.product.images[0]}
                          alt={item.product.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[var(--color-text-light)]">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.product.name}</p>
                      <div className="text-sm text-[var(--color-text-light)]">
                        {hasSalePrice ? (
                          <span>
                            <span className="text-orange-600 font-medium">{formatPrice(item.product.sale_price!)}</span>
                            <span className="line-through ml-1">{formatPrice(item.product.price)}</span>
                            <span> x {item.quantity}</span>
                          </span>
                        ) : (
                          <span>{formatPrice(item.product.price)} x {item.quantity}</span>
                        )}
                      </div>
                    </div>
                    <p className={`font-medium text-sm ${hasSalePrice ? 'text-orange-600' : ''}`}>
                      {formatPrice(itemPrice * item.quantity)}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-[var(--color-border)] pt-4">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Tổng cộng</span>
                <span className="text-[var(--color-primary)]">{formatPrice(total)}</span>
              </div>
              <p className="text-xs text-[var(--color-text-light)] mt-1">
                (Đã bao gồm VAT)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className="bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 max-w-sm">
            <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-semibold">Thông tin không hợp lệ</p>
              <p className="text-sm opacity-90">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast({ show: false, message: '' })}
              className="ml-2 p-1 hover:bg-white/20 rounded transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
