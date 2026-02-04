'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase, Order, OrderWithItems } from '@/lib/supabase';

interface MonthlyReport {
  month: string;
  totalOrders: number;
  totalRevenue: number;
  productsSold: number;
}

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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

  const monthlyReports = useMemo(() => {
    const reports: Record<string, MonthlyReport> = {};

    orders
      .filter(order => order.status !== 'cancelled')
      .forEach(order => {
        const date = new Date(order.created_at);
        const year = date.getFullYear();

        if (year !== selectedYear) return;

        const monthKey = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!reports[monthKey]) {
          reports[monthKey] = {
            month: monthKey,
            totalOrders: 0,
            totalRevenue: 0,
            productsSold: 0,
          };
        }

        reports[monthKey].totalOrders += 1;
        reports[monthKey].totalRevenue += Number(order.total);
        reports[monthKey].productsSold += order.order_items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      });

    return Object.values(reports).sort((a, b) => a.month.localeCompare(b.month));
  }, [orders, selectedYear]);

  const yearlyStats = useMemo(() => {
    return monthlyReports.reduce(
      (acc, report) => ({
        totalOrders: acc.totalOrders + report.totalOrders,
        totalRevenue: acc.totalRevenue + report.totalRevenue,
        productsSold: acc.productsSold + report.productsSold,
      }),
      { totalOrders: 0, totalRevenue: 0, productsSold: 0 }
    );
  }, [monthlyReports]);

  const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    orders.forEach(order => {
      years.add(new Date(order.created_at).getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [orders]);

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

  const getMonthName = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    return `Tháng ${parseInt(month)}/${year}`;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      pending: { label: 'Chờ xử lý', className: 'badge-pending' },
      confirmed: { label: 'Đã xác nhận', className: 'badge-confirmed' },
      shipping: { label: 'Đang giao', className: 'badge-shipping' },
      delivered: { label: 'Đã giao', className: 'badge-delivered' },
      cancelled: { label: 'Đã hủy', className: 'badge-cancelled' },
    };
    const status_info = statusMap[status] || { label: status, className: 'badge' };
    return <span className={`badge ${status_info.className}`}>{status_info.label}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const maxRevenue = Math.max(...monthlyReports.map(r => r.totalRevenue), 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Thống kê</h1>
        <div className="relative">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="appearance-none bg-white border-2 border-[var(--color-border)] rounded-xl px-5 py-2.5 pr-10 font-medium text-[var(--color-text)] hover:border-[var(--color-primary)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)] outline-none cursor-pointer transition-all shadow-sm"
          >
            {availableYears.length > 0 ? (
              availableYears.map(year => (
                <option key={year} value={year}>Năm {year}</option>
              ))
            ) : (
              <option value={selectedYear}>Năm {selectedYear}</option>
            )}
          </select>
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-light)] pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6 border border-[var(--color-border)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-[var(--color-text-light)] text-sm">Tổng đơn hàng</p>
              <p className="text-2xl font-bold">{yearlyStats.totalOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-[var(--color-border)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-[var(--color-text-light)] text-sm">Tổng doanh thu</p>
              <p className="text-2xl font-bold">{formatPrice(yearlyStats.totalRevenue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-[var(--color-border)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <p className="text-[var(--color-text-light)] text-sm">Sản phẩm đã bán</p>
              <p className="text-2xl font-bold">{yearlyStats.productsSold}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Chart */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-[var(--color-border)]">
          <h2 className="text-xl font-bold mb-6">Báo cáo theo tháng</h2>

          {monthlyReports.length === 0 ? (
            <div className="text-center py-12 text-[var(--color-text-light)]">
              Không có dữ liệu cho năm này
            </div>
          ) : (
            <div className="space-y-4">
              {monthlyReports.map((report) => (
                <div key={report.month}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{getMonthName(report.month)}</span>
                    <span className="text-[var(--color-text-light)]">{formatPrice(report.totalRevenue)}</span>
                  </div>
                  <div className="w-full bg-[var(--color-bg-secondary)] rounded-full h-3">
                    <div
                      className="gold-gradient h-3 rounded-full transition-all duration-500"
                      style={{ width: `${(report.totalRevenue / maxRevenue) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-[var(--color-text-light)] mt-1">
                    <span>{report.totalOrders} đơn hàng</span>
                    <span>{report.productsSold} sản phẩm</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Đơn hàng gần đây</h2>
            <a href="/admin/orders" className="text-[var(--color-primary)] hover:underline text-sm font-medium">
              Xem tất cả
            </a>
          </div>

          {recentOrders.length === 0 ? (
            <div className="text-center py-12 text-[var(--color-text-light)]">
              Chưa có đơn hàng nào
            </div>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between py-3 border-b border-[var(--color-border)] last:border-0">
                  <div>
                    <p className="font-medium">{order.customer_name}</p>
                    <p className="text-sm text-[var(--color-text-light)]">{formatDate(order.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[var(--color-primary)]">{formatPrice(order.total)}</p>
                    {getStatusBadge(order.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
