'use client';

import { useState, useEffect } from 'react';
import { supabase, OrderWithItems } from '@/lib/supabase';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            product:products (*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      setOrders(orders.map(order =>
        order.id === orderId ? { ...order, status: newStatus as OrderWithItems['status'] } : order
      ));

      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus as OrderWithItems['status'] });
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Có lỗi xảy ra khi cập nhật trạng thái');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const statusOptions = [
    { value: 'pending', label: 'Chờ xử lý', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'confirmed', label: 'Đã xác nhận', color: 'bg-blue-100 text-blue-800' },
    { value: 'shipping', label: 'Đang giao', color: 'bg-purple-100 text-purple-800' },
    { value: 'delivered', label: 'Đã giao', color: 'bg-green-100 text-green-800' },
    { value: 'cancelled', label: 'Đã hủy', color: 'bg-red-100 text-red-800' },
  ];

  const getStatusBadge = (status: string) => {
    const option = statusOptions.find(o => o.value === status);
    return (
      <span className={`badge ${option?.color || 'bg-gray-100 text-gray-800'}`}>
        {option?.label || status}
      </span>
    );
  };

  const filteredOrders = statusFilter
    ? orders.filter(order => order.status === statusFilter)
    : orders;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Quản lý đơn hàng</h1>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--color-text-light)]">Lọc:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field w-40"
          >
            <option value="">Tất cả</option>
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-md border border-[var(--color-border)] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[var(--color-bg-secondary)]">
            <tr>
              <th className="px-6 py-4 text-left font-semibold">Mã đơn</th>
              <th className="px-6 py-4 text-left font-semibold">Khách hàng</th>
              <th className="px-6 py-4 text-left font-semibold">Ngày đặt</th>
              <th className="px-6 py-4 text-right font-semibold">Tổng tiền</th>
              <th className="px-6 py-4 text-center font-semibold">Thanh toán</th>
              <th className="px-6 py-4 text-center font-semibold">Trạng thái</th>
              <th className="px-6 py-4 text-center font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-[var(--color-text-light)]">
                  Không có đơn hàng nào
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-[var(--color-bg-secondary)] transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm">{order.id.slice(0, 8)}...</span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium">{order.customer_name}</p>
                      <p className="text-sm text-[var(--color-text-light)]">{order.customer_phone}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[var(--color-text-light)]">
                    {formatDate(order.created_at)}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-[var(--color-primary)]">
                    {formatPrice(order.total)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full ${(order as unknown as { payment_method?: string }).payment_method === 'bank_transfer'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                      }`}>
                      {(order as unknown as { payment_method?: string }).payment_method === 'bank_transfer' ? 'Chuyển khoản' : 'COD'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {getStatusBadge(order.status)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="p-2 text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between">
              <h2 className="text-xl font-bold">Chi tiết đơn hàng</h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 hover:bg-[var(--color-bg-secondary)] rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[var(--color-text-light)]">Mã đơn hàng</p>
                  <p className="font-mono">{selectedOrder.id}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--color-text-light)]">Ngày đặt</p>
                  <p>{formatDate(selectedOrder.created_at)}</p>
                </div>
              </div>

              {/* Customer Info */}
              <div className="bg-[var(--color-bg-secondary)] rounded-xl p-4">
                <h3 className="font-semibold mb-3">Thông tin khách hàng</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="text-[var(--color-text-light)]">Họ tên:</span> {selectedOrder.customer_name}</p>
                  <p><span className="text-[var(--color-text-light)]">SĐT:</span> {selectedOrder.customer_phone}</p>
                  {selectedOrder.customer_email && (
                    <p><span className="text-[var(--color-text-light)]">Email:</span> {selectedOrder.customer_email}</p>
                  )}
                  <p><span className="text-[var(--color-text-light)]">Địa chỉ:</span> {selectedOrder.customer_address}</p>
                  <p>
                    <span className="text-[var(--color-text-light)]">Thanh toán:</span>{' '}
                    <span className={`font-medium ${(selectedOrder as unknown as { payment_method?: string }).payment_method === 'bank_transfer'
                        ? 'text-blue-600'
                        : 'text-gray-600'
                      }`}>
                      {(selectedOrder as unknown as { payment_method?: string }).payment_method === 'bank_transfer' ? 'Chuyển khoản ngân hàng' : 'Thanh toán khi nhận hàng (COD)'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="font-semibold mb-3">Sản phẩm</h3>
                <div className="space-y-3">
                  {selectedOrder.order_items?.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0">
                      <div>
                        <p className="font-medium">{item.product?.name || 'Sản phẩm không xác định'}</p>
                        <p className="text-sm text-[var(--color-text-light)]">
                          {formatPrice(item.unit_price)} x {item.quantity}
                        </p>
                      </div>
                      <p className="font-bold">{formatPrice(item.unit_price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-4 mt-4 border-t border-[var(--color-border)]">
                  <span className="font-bold text-lg">Tổng cộng</span>
                  <span className="font-bold text-xl text-[var(--color-primary)]">{formatPrice(selectedOrder.total)}</span>
                </div>
              </div>

              {/* Status Update */}
              <div>
                <h3 className="font-semibold mb-3">Cập nhật trạng thái</h3>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => updateOrderStatus(selectedOrder.id, option.value)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${selectedOrder.status === option.value
                        ? 'gold-gradient text-white'
                        : 'bg-[var(--color-bg-secondary)] hover:bg-[var(--color-primary-light)]'
                        }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
